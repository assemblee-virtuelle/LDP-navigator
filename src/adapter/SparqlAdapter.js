'use strict';

const jsonld = require('jsonld');
const fetch = require('node-fetch');
const urljoin = require('url-join');
const JsonLdParser = require('jsonld-streaming-parser').JsonLdParser;
const streamifyString = require('streamify-string');

class SparqlAdapter {
  constructor(config) {
    this.config = config;
  }

  async resolveById(id,forceResolveById) {
    if (forceResolveById==true || this.config.skeepResolveById != true) {
      // console.log('SPARQL resolveById', id);
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        body: `
        ${this.config.prefix?this.config.prefix:''}
        CONSTRUCT  {
          ?s1 ?p1 ?o1 .
        }
        WHERE {
          BIND(<${id}> AS ?s1) .
          ?s1 ?p1 ?o1 .
        }
        `,
        headers: this.config.headers
      });

      // const tmp = await response.text();
      // console.log('tmp',tmp);
      // let parsed= JSON.parse(tmp);
      // console.log('parsed',parsed);

      const result = await response.json();
      // await this.persist(result);
      // console.log('SpasrqlAdapter resolveById',result);
      return result;
    } else {
      return undefined
    }

  }

  jsonToQuads(input) {
    return new Promise((resolve, reject) => {
      try {
        const myParser = new JsonLdParser();
        const jsonString = typeof input === 'object' ? JSON.stringify(input) : input;
        const textStream = streamifyString(jsonString);
        let res = [];
        // console.log(myParser);
        myParser
          .import(textStream)
          .on('data', quad => res.push(quad))
          .on('error', error => reject(error))
          .on('end', () => resolve(res));
      } catch (e) {
        reject(e)
      }

    });
  }



  nodeToString(node) {
    switch (node.termType) {
      case 'Variable':
        return `?${node.value}`;
      case 'NamedNode':
        return `<${node.value}>`;
      case 'Literal':
        if (node.datatype.value === 'http://www.w3.org/2001/XMLSchema#string') {
          // Use triple quotes SPARQL notation to allow new lines and double quotes
          // See https://www.w3.org/TR/sparql11-query/#QSynLiterals
          return `'''${node.value}'''`;
        } else {
          return `"${node.value}"^^<${node.datatype.value}>`;
        }
      default:
        throw new Error('Unknown node type: ' + node.termType);
    }
  }

  triplesToString(triples) {
    return triples
      .map(
        triple => {
          //TODO considering blanck nodes
          if (triple.object.termType != 'BlankNode' && triple.subject.termType != 'BlankNode') {
            return `${this.nodeToString(triple.subject)} <${triple.predicate.value}> ${this.nodeToString(triple.object)} .`
          } else {
            return ''
          }

        }

      )
      .join('\n');
  }

  getTriplesDifference(triples1, triples2) {
    return triples1.filter(t1 => !triples2.some(t2 => t1.equals(t2)));
  }

  getTripleswhitSamePredicate(triples1, triples2) {
    const result = triples1.filter(t1 => triples2.some(t2 => t1.predicate.equals(t2.predicate)));
    // console.log('result',result);
    return result
  }

  async persist(resource) {
    // console.log('persist resource',resource['@id']?resource['@id']:Array.isArray(resource)?'Array':'?');
    // console.trace("persist")
    if (this.config.skeepPersist != true) {
      if (Array.isArray(resource)) {
        let result=[];
        for (var r of resource) {
          // console.log('persist Array',r['@id']);
          const persistResult=await this.persist(r);
          if(persistResult){
              result.push(persistResult);
          }

        }
        return result
      } else if (resource['@graph']) {
        let result=[]
        for (var r of resource['@graph']) {
          const persistResult = await this.persist({
            '@context':resource['@context'],
            ...r
          })
          if(persistResult){
            const {
              '@context': context,
              ...noContext
            } = persistResult;
            result.push(noContext);
          }
        }
        return {
          '@context':resource['@context'],
          '@graph':result
        }

      } else {
        // console.log('persist update raw',resource);
        let oldData = await this.resolveById(resource['@id'],true);
        // console.log('oldData',oldData);

        if (oldData && oldData['@id']) {
          // console.log('SPARQL UPDATE',resource['@id']);
          let oldTriples = await this.jsonToQuads(oldData);
          let newTriples = await this.jsonToQuads(resource);

          // const triplesToAdd = this.getTriplesDifference(newTriples, oldTriples).reverse();
          const triplesToAdd = newTriples;
          const triplesToRemove = this.getTripleswhitSamePredicate(oldTriples, newTriples);

          let query = '';
          if (triplesToRemove.length > 0) query += `DELETE { ${this.triplesToString(triplesToRemove)} } `;
          if (triplesToAdd.length > 0) query += `INSERT { ${this.triplesToString(triplesToAdd)} } `;
          query += `WHERE { `;
          // if (existingBlankNodes.length > 0) query += this.triplesToString(existingBlankNodes);
          // if (newBlankNodes.length > 0) query += this.bindNewBlankNodes(newBlankNodes);
          query += ` }`;


          // console.log('query',query);

          const response = await fetch(urljoin('http://dfc-fuseki:3030/', 'localData', 'update'), {
            body: query,
            method: 'POST',
            headers: {
              'Content-Type': 'application/sparql-update',
              Authorization: 'Basic ' + Buffer.from('admin' + ':' + 'admin').toString('base64')
            }
          });
          resource = this.resolveById(resource['@id'],true)
        } else {
          // console.log('SPARQL CREATE', resource['@id']);
          const rdf = await jsonld.toRDF(resource, {
            format: 'application/n-quads'
          });

          const response = await fetch(urljoin('http://dfc-fuseki:3030/', 'localData', 'update'), {
            body: `INSERT DATA { ${rdf} }`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/sparql-update',
              Authorization: 'Basic ' + Buffer.from('admin' + ':' + 'admin').toString('base64')
            }
          });
          // console.log('resolveById post insert');
          resource = this.resolveById(resource['@id'],true)
          // console.log('resolveById2 post insert');
        }
      }
      return resource
    } else {
      return undefined;
    }

  }
}

export default SparqlAdapter;
