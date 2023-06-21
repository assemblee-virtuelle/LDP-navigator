'use strict';

// const jsonld = require('jsonld');
// const fetch = require('node-fetch');
// const urljoin = require('url-join');
// const JsonLdParser = require('jsonld-streaming-parser').JsonLdParser;
// const streamifyString = require('streamify-string');

import ldpSemapps from '@semapps/ldp';
// import {buildDereferenceQuery} from '@semapps/ldp';
import jsonld from 'jsonld';
import fetch from 'node-fetch';
import jsonldStreamingParser from 'jsonld-streaming-parser';
import {JsonLdParser} from "jsonld-streaming-parser";
// console.log(jsonldStreamingParser);
// const JsonLdParser = jsonldStreamingParser.JsonLdParser;
import streamifyString from 'streamify-string';
import dataFactory from '@rdfjs/data-model';

class SparqlAdapter {
  constructor(config) {
    this.config = config;
  }

  async resolveById(id,forceResolveById,depth) {
    let dereferenceQuery = this.config.dereference
    if (this.config.dereference){
      dereferenceQuery =ldpSemapps.buildDereferenceQuery(this.config.dereference);
    }

    // console.log('dereferenceQuery',dereferenceQuery);

    // console.log('sparql depth',depth);
    if (forceResolveById==true || this.config.skipResolveById != true) {
      // console.log(' '.repeat(depth),'SPARQL resolveById', id);
      const query =  `
      ${this.config.query.prefix?this.config.query.prefix:''}
      CONSTRUCT  {
        ?s1 ?p1 ?o1 .
        ${dereferenceQuery?dereferenceQuery.construct:''}
      }
      WHERE {
        {
          BIND(<${id}> AS ?s1) .
          ?s1 ?p1 ?o1 .
          ${dereferenceQuery?dereferenceQuery.where:''}
        }
        UNION
        {
          GRAPH ?g {
            BIND(<${id}> AS ?s1) .
            ?s1 ?p1 ?o1 .
            ${dereferenceQuery?dereferenceQuery.where:''}
          }
        }
      }
      `

      const response = await fetch(this.config.query.endpoint, {
        method: 'POST',
        body: query,
        headers: this.config.query.headers
      });



      const raw = await response.text();
      // console.log('SPARQL resolveById',id,raw)
      let parsed= JSON.parse(raw);

      let framed = await jsonld.frame(parsed, {
        '@id':id
      });
      framed ={
        '@context':parsed['@context'],
        ...framed,
      }

      // console.log('SPARQL resolveById',id,JSON.stringify(parsed))
      return framed;

      // const result = await response.json();
      // await this.persist(result);
      // console.log('SpasrqlAdapter resolveById',result);
      // return result;
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

  convertBlankNodesToVars(triples, blankNodesVarsMap) {
    return triples.map(triple => {
      if (triple.subject.termType === 'BlankNode') {
        triple.subject = dataFactory.variable(triple.subject.value);
      }
      if (triple.object.termType === 'BlankNode') {
        triple.object = dataFactory.variable(triple.object.value);
      }
      return triple;
    });
  }

  buildJsonVariable(identifier, triples) {
    const blankVariables = triples.filter(t => t.subject.value.localeCompare(identifier) === 0);
    let json = {};
    let allIdentifiers = [identifier];
    for (var blankVariable of blankVariables) {
      if (blankVariable.object.termType === 'Variable') {
        const jsonVariable = this.buildJsonVariable(blankVariable.object.value, triples);
        json[blankVariable.predicate.value] = jsonVariable.json;
        allIdentifiers = allIdentifiers.concat(jsonVariable.allIdentifiers);
      } else {
        json[blankVariable.predicate.value] = blankVariable.object.value;
      }
    }
    return { json, allIdentifiers };
  }

  removeDuplicatedVariables(triples) {
    const roots = triples.filter(n => n.object.termType === 'Variable' && n.subject.termType !== 'Variable');
    const rootsIdentifiers = roots.reduce((previousValue, currentValue) => {
      let result = previousValue;
      if (!result.find(i => i.localeCompare(currentValue.object.value) === 0)) {
        result.push(currentValue.object.value);
      }
      return result;
    }, []);
    let rootsJson = [];
    for (var rootIdentifier of rootsIdentifiers) {
      const jsonVariable = this.buildJsonVariable(rootIdentifier, triples);
      rootsJson.push({
        rootIdentifier,
        stringified: JSON.stringify(jsonVariable.json),
        allIdentifiers: jsonVariable.allIdentifiers
      });
    }
    let keepVariables = [];
    let duplicatedVariables = [];
    for (var rootJson of rootsJson) {
      if (keepVariables.find(kp => kp.stringified.localeCompare(rootJson.stringified) === 0)) {
        duplicatedVariables.push(rootJson);
      } else {
        keepVariables.push(rootJson);
      }
    }
    let allRemovedIdentifiers = duplicatedVariables.map(dv => dv.allIdentifiers).flat();
    let removedDuplicatedVariables = triples.filter(
      t => !allRemovedIdentifiers.includes(t.object.value) && !allRemovedIdentifiers.includes(t.subject.value)
    );
    return removedDuplicatedVariables;
  }

  bindNewBlankNodes(triples) {
    return triples.map(triple => `BIND (BNODE() AS ?${triple.object.value}) .`).join('\n');
  }

  async persist(resource) {
    // console.log('persist resource',resource['@id']?resource['@id']:Array.isArray(resource)?'Array':'?');
    // console.trace("log ressource",resource)
    if (this.config.skipPersist != true) {

      if (Array.isArray(resource)) {
        // console.log('persist resource Array');
        // console.log('ARRAY',resource);
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
        // console.log('persist resource @graph');
        // console.log('GRAPH',resource);
        let result=[]
        for (var r of resource['@graph']) {
          if(resource['@context']){
            r['@context']=resource['@context'];
          }
          const persistResult = await this.persist({...r})
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

      } else if (resource['@id'] && !resource['@id'].includes('_:')) {
        // console.log('persist update raw',resource);
        // console.log('persist resource ',JSON.stringify(resource));
        let oldData = await this.resolveById(resource['@id'],true);
        console.log('oldData',oldData);

        if (oldData && oldData['@id']) {
          // console.log('SPARQL UPDATE',resource['@id']);
          let oldTriples = await this.jsonToQuads(oldData);
          let newTriples = await this.jsonToQuads(resource);


          oldTriples = this.convertBlankNodesToVars(oldTriples);
          newTriples = this.convertBlankNodesToVars(newTriples);

          newTriples = this.removeDuplicatedVariables(newTriples);

          // const triplesToAdd = this.getTriplesDifference(newTriples, oldTriples).reverse();
          const triplesToAdd = newTriples;
          const triplesToRemove = this.getTripleswhitSamePredicate(oldTriples, newTriples);


          const newBlankNodes = this.getTriplesDifference(newTriples, oldTriples).filter(
            triple => triple.object.termType === 'Variable'
          );
          const existingBlankNodes = oldTriples.filter(
            triple => triple.object.termType === 'Variable' || triple.subject.termType === 'Variable'
          );

          let query = '';
          if (triplesToRemove.length > 0) query += `DELETE { ${this.triplesToString(triplesToRemove)} } `;
          if (triplesToAdd.length > 0) query += `INSERT { ${this.triplesToString(triplesToAdd)} } `;
          query += `WHERE { `;
          if (existingBlankNodes.length > 0) query += this.triplesToString(existingBlankNodes);
          if (newBlankNodes.length > 0) query += this.bindNewBlankNodes(newBlankNodes);
          query += ` }`;


          console.log('query',query);

          const response = await fetch(this.config.update.endpoint, {
            body: query,
            method: 'POST',
            headers: this.config.update.headers
          });
          resource = this.resolveById(resource['@id'],true)
        } else {
          // console.log('SPARQL CREATE', resource['@id'],resource);
          const rdf = await jsonld.toRDF(resource, {
            format: 'application/n-quads'
          });

          const response = await fetch(this.config.update.endpoint, {
            body: `INSERT DATA { ${rdf} }`,
            method: 'POST',
            headers: this.config.update.headers
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
