'use strict';

// const jsonld = require('jsonld');
// const sift = require('sift').default;
// const fetch = require('node-fetch');

import jsonld from 'jsonld';
import sift from 'sift';
import fetch from 'node-fetch';
import isObject from 'isobject';

class LDPNavigator {
  constructor(config) {
    this.config = config || {}
    this.context = this.config.context || {};
    this.adapters = this.config.adapters || [];
  }

  setAdapters(adapters) {
    this.adapters = adapters;
  }

  //
  async filterInMemory(filter) {

    // console.log('filterInMemory',this.graph);
    const result = this.graph.filter(sift(filter));
    return result;
  }
  //
  async findInMemory(filter) {
    // console.log('ALLLOOO');
    const filtered = await this.filterInMemory(filter);
    // console.log('filtered',filtered.length,filtered);
    if (filtered.length == 1) {
      return filtered[0];
    } else if (filtered.length > 1) {
      throw new Error(`to many results applying filter`)
    } else {
      throw new Error(`no results applying filter`)
    }
  }

  async init(contextData) {
    let resolvedContextData;
    if (contextData.includes && contextData.includes('http')) {
      resolvedContextData = await this.resolveById(contextData);
    } else {
      resolvedContextData = contextData;
      // console.log("Memory",resolvedContextData);
      // console.log('addTo Memory <=init');
      await this.addToMemory(resolvedContextData);
      // this.context = {...this.context,...resolvedContextData['@context']}
      // this.flatten = await jsonld.flatten(resolvedContextData, this.context);
      // this.graph = this.flatten['@graph'];
      // this.expand = await jsonld.expand(this.flatten);
    }
  }



  async addToMemory(resourceIn) {

    // remove @id alias because not supported by some function
    const {id,...resourceContext}= resourceIn['@context'];
    const resource = await jsonld.compact(resourceIn,resourceContext);
    // console.log('resource',resource['@id'],resource['dfc-b:description']);

    this.context = {
      ...this.context,
      ...resource['@context']
    };

    if (Array.isArray(resource)) {
      // console.log('addToMemory array');
      for (let r of resource) {
        await this.addToMemory(r);
      }
    } else {
      const flattenButNotBlanck = await this.flattenButNotBlanck(resource, this.context)
      // console.log('flattenButNotBlanck',flattenButNotBlanck);
      if (flattenButNotBlanck['@graph'].length > 1) {
        for (let r of flattenButNotBlanck['@graph']) {
          await this.addToMemory({
            '@context': flattenButNotBlanck['@context'],
            ...r
          });
        }
      } else {


        if (this.flatten) {
          if (flattenButNotBlanck['@graph'].length > 0) {
            const singleResource = flattenButNotBlanck['@graph'][0];
            let existing = this.flatten['@graph'].find(s => s['@id'] == singleResource['@id']);
            let otherResources = this.flatten['@graph'].filter(s => s['@id'] != singleResource['@id']);
            if (existing) {
              this.flatten['@graph']=[...otherResources,singleResource]
            } else {
              this.flatten['@graph'].push(singleResource);
            }
          }
          this.flatten['@context'] = flattenButNotBlanck['@context'];
        } else {
          this.flatten = flattenButNotBlanck;
        }
        this.graph = this.flatten['@graph'];
        this.compact = await jsonld.compact(this.flatten, this.context);
        this.expand = await jsonld.expand(this.flatten);

      }
    }
  }


  // async getBlancksByValue(value, flatFullGraph) {
  //
  //   if (Array.isArray(value)) {
  //     // return value.map(async s=>(await this.getBlancksByValue(s,flatFullGraph)));
  //     let newValue = [];
  //     for (const v of value) {
  //       const blankResolution = await this.getBlancksByValue(v, flatFullGraph);
  //       if (blankResolution) {
  //         newValue.push(blankResolution);
  //       }
  //     }
  //     return newValue;
  //   } else if ((typeof value === 'string' || value instanceof String) && value.includes('_:')) {
  //     if (value.includes('_:')) {
  //       let blank = flatFullGraph['@graph'].find(s => s['@id'] == value);
  //       delete blank['@id'];
  //       return blank;
  //     } else {
  //       return value
  //     }
  //   } else if (value['@id'] && value['@id'].includes('_:')) {
  //     // console.log('flatFullGraph for',value['@id'] );
  //     let blank = flatFullGraph['@graph'].find(s => s['@id'] == value['@id'])
  //     // console.log('blank',blank);
  //     if (blank) {
  //       delete blank['@id'];
  //     }
  //     return blank;
  //   } else if (!(typeof value === 'object')) {
  //     return value
  //   } else {
  //     // console.log(value);
  //     // throw new Error('getBlancksByValue have to be call for effectiv value and not oject without @id linked to banck node in graph')
  //     return value
  //   }
  // }
  //
  // async getBlancksBySubject(subject, flatFullGraph) {
  //
  //   // console.log('--------- getBlancksByValue subject before recomposed',subject);
  //   let result = {
  //     ...subject
  //   };
  //   // console.log('--------- getBlancksByValue subject recomposed',result);
  //   // console.log('getBlancksBySubject subject ',);
  //   for (const [key, value] of Object.entries(result)) {
  //     // let newValue;
  //     //
  //     // newValue= flatFullGraph['@graph'].find(s=>s['@id']==value)
  //     // console.log('-- getBlancksBySubject',key,value);
  //     result[key] = await this.getBlancksByValue(value, flatFullGraph);
  //     // console.log('-- getBlancksBySubject result',result[key]);
  //   }
  //   return result
  //
  //
  // }
  async flattenButNotBlanck(resource, context) {
    const flat = await jsonld.flatten(resource, context);
    // console.log('flat',flat);
    let out = [];
    let idsBlank = [];
    const blanks = flat['@graph'].map(s=>{
      if (s['@id'] && s['@id'].includes('_:')){
        // console.log('s',s['@id']);
        // idsBlank.push(s['@id']);
        return s
      }
    });

    if (flat['@graph'] && flat['@graph'].length > 0) {
      for (let subject of flat['@graph']) {
        // console.log('subject',subject);
        if (subject['@id'] && !subject['@id'].includes('_:')) {
          const graph= [...blanks,subject];
          const framed = await jsonld.frame({
            '@context':flat['@context'],
            '@graph':graph
            },
            {
              '@context':flat['@context'],
              "@id":subject['@id']
            }
          );
          const {
            '@context': context,
            ...noContext
          }  = framed
          // console.log("noContext",noContext);
          out.push(noContext);
        }
      }
    }
    // console.log('flattenButNotBlanck out');
    // console.log('flattenButNotBlanck out',out);
    return {
      "@context": flat['@context'],
      "@graph": out
    }
  }

  async resolveById(id, options, depth) {
    // console.log('resolveById', id, depth);
    if (depth > 100) {
      throw new Error("resolveById with depth>100 not supported")
    }
    // console.trace("Here I am!")
    depth = depth || 0;
    let result = undefined
    if (result == undefined) {
      // let resultInMemory = await this.findInMemory({'@id':id})
      const unprefixedId = this.unPrefix(id);

      // console.log("this.expand", this.expand);
      if (this.expand) {

        // console.log("resolveById",id,this.expand);

        let resultInMemory = this.expand.find(f => f["@id"] == id);
        // console.log('resultInMemory', id, resultInMemory, );
        // console.log(this.graph);
        if (resultInMemory) {
          // console.log('resolveById result In Memory');
          const compactInMemory = await jsonld.compact(resultInMemory, this.context);
          // console.log('compactInMemory',compactInMemory);
          if (options && options.expand == true) {
            result = resultInMemory;
          } else if (options && options.noContext == true) {
            const {
              '@context': context,
              ...noContext
            } = compactInMemory;
            result = noContext;
          } else {
            result = compactInMemory
          }
        }
        // console.log('resolveById result',result);
      }
    }
    // console.log(result == undefined);
    if (result == undefined) {
      // console.log('id not found ',id);
      for (let i = 0; i < this.adapters.length; i++) {
        const adapter = this.adapters[i];
        // console.log('adapter', adapter.constructor.name);
        // console.log('navigator depth',depth);
        let resultAdapter = await adapter.resolveById(id, undefined, depth);
        // console.log('resultAdapter', JSON.stringify(resultAdapter));
        if (resultAdapter && (resultAdapter['@id'] || resultAdapter['@graph'])) {
          // console.log('resolveById result In Adapter', adapter.constructor.name);

          // console.log('BEFORE COMPACT',resultAdapter,this.context);

          resultAdapter = await jsonld.compact(resultAdapter, this.context);
          // console.log('AFTER COMPACT',resultAdapter);
          // console.log('resultAdapter BEFOR PESIST',resultAdapter);

          // if (resultAdapter['@graph']){
          //   resultAdapter=resultAdapter['@graph'].filter(r=>r['@id']==)
          // }

          for (let j = i - 1; j >= 0; j--) {
            const persistAdapter = this.adapters[j];
            // console.log('persistAdapter',persistAdapter);
            if (persistAdapter.persist) {
              // console.log('PERSIST');
              const adapterPersistResult = await persistAdapter.persist(resultAdapter);
              resultAdapter = await jsonld.compact(adapterPersistResult, this.context);
            } else {
              // console.log('NO PERSIST');
            }
          }

          // console.log('resultAdapter AFTER PERSIST',resultAdapter);

          await this.addToMemory(resultAdapter)

          // if(resultAdapter['@graph']){
          //   if (resultAdapter['@graph'].length>1){
          //     throw new Error('resolveById have to return one subject')
          //   }
          //   for (let subject of resultAdapter['@graph']){
          //     console.log('addToMemory<=resolveById graph', );
          //     await this.addToMemory({
          //       '@context':resultAdapter['@context'],
          //       ...subject
          //     })
          //   }
          //   await this.addToMemory(resultAdapter)
          // }else{
          //   // console.log('add to memory ',resultAdapter);
          //   console.log('addToMemory<=resolveById direct subject');
          //   await this.addToMemory(resultAdapter)
          // }

          // Get From memory
          // console.log('final get to return memory value for resolveById after adapter');
          result = this.resolveById(id, options, depth + 1)
          break;
        }
      }

    }

    return result;
  }

  async persist() {
    // console.log('expand',this.expand);
    for (var adapter of this.adapters) {
      if (adapter.persist) {
        // console.log('persist',this.expand);
        // console.log('LDP Navigator BEFORE persist');
        await adapter.persist(this.expand);
        // console.log('LDP Navigator AFTER persist');
      }
    }
  }


  unPrefix(property) {
    let out;
    let url;
    // console.log('this.context',this.context);
    for (const [key, value] of Object.entries(this.context)) {
      // console.log('unPrefix',key, value);
      const regex = new RegExp(`${key}:(.*)`, 'gm');
      // const regex = /`${key}:(.*)`/gm;
      const result = regex.exec(property);
      // console.log('regex',property,result);
      if (result != null) {
        // out = result[1];
        // url = value;
        out = value + result[1]
        break;
      }
    }

    return out;
  }

  async get(mainData, property, noContext, depth) {
    depth = depth || 0;
    // console.log('GET', property,mainData);
    const unPrefixedProperty = this.unPrefix(property);
    // console.log('mainData',mainData,unPrefixedProperty);
    // console.log('expand',JSON.stringify(this.expand));
    let rawProperty
    // console.log();
    if(mainData['@id'] || mainData['id']){
      const mainDataInNavigator = await this.expand.find(e => e['@id'] == (mainData['@id'] || mainData['id']));
      rawProperty = mainDataInNavigator[unPrefixedProperty];
    }else{
      const expandData = await jsonld.expand({
        '@context':this.context,
        ...mainData
      })
      // console.log('expandData',expandData);
      const mainDataExpanded= expandData.find(d=>!(d['@id']||d['id']));
      if(mainDataExpanded){
        rawProperty=mainDataExpanded[unPrefixedProperty];
      }
      // console.log('rawProperty',unPrefixedProperty,rawProperty);
    }
    // const mainDataInNavigator = await this.expand.find(e => e['@id'] == (mainData['@id'] || mainData['id']));
    // console.log('mainDataInNavigator',mainDataInNavigator);
    // console.log('unPrefixedProperty',property,unPrefixedProperty);
    // const rawProperty = mainDataInNavigator[unPrefixedProperty];
    // let rawProperty = mainDataInNavigator[property];
    // console.log(mainDataInNavigator,property,unPrefixedProperty,rawProperty);
    // console.log('rawProperty',rawProperty);
    if (rawProperty) {
      if (!Array.isArray(rawProperty)) {
        rawProperty = [rawProperty];
      }

      let out = [];
      for (var prop of rawProperty) {
        // console.log('raw prop', prop);
        if (prop['@id']) {
          // console.log('resolveById after get');
          // const dereference = this.graph.find(f=>f["@id"]==prop['@id']);
          const dereference = await this.resolveById(prop['@id'], {
            noContext: true
          }, depth);
          out.push(dereference);
        } else if (prop['@value']) {
          // return prop['@value'];
          out.push(prop['@value'])
        } else {
          const {
            '@context': context,
            ...compactProp
          } = await jsonld.compact(prop,this.context)
          //blank nodes
          out.push(compactProp);
        }
      }

      if (!(Array.isArray(mainData[property])) && out.length == 1 && !(this.config.forceArray && this.config.forceArray.includes(property))) {
        out = out[0];
      }
      // console.log('out', out);
      return out
    } else {
      if (this.config.forceArray && this.config.forceArray.includes(property)) {
        return [];
      } else {
        return undefined;
      }

    }
  }

  async dereference(mainData, propertiesSchema, depth) {
    // console.log('dereference',mainData['@id']?mainData['@id']:mainData,propertiesSchema);
    depth = depth || 1;

    // console.log('LDP DEREFERENCE');
    if (Array.isArray(mainData)) {
      let result = [];
      for (var mainDataIteration of mainData) {
        result.push(await this.dereference(mainDataIteration, propertiesSchema, depth))
      }
      return result;
    } else if (isObject(mainData)) {
      // console.log('dereference CALL',mainData,propertiesSchema);
      let resultData = {
        ...mainData
      };

      let propertiesSchemaArray = [];
      if (!Array.isArray(propertiesSchema)) {
        propertiesSchemaArray = [propertiesSchema];
      } else {
        propertiesSchemaArray = [...propertiesSchema]
      }

      for (var propertySchema of propertiesSchemaArray) {
        // console.log(' '.repeat(depth),'dereference', propertySchema.p, 'of',(mainData['@id']?mainData['@id']:mainData));
        const property = propertySchema.p;
        // console.log('get',mainData,property);
        const reference = await this.get(mainData, property, true, depth);
        // console.log('reference',reference);
        if (propertySchema.n && reference != undefined) {
          // console.log('dereference NEXT',reference);
          const dereference = await this.dereference(reference, propertySchema.n, depth + 1);
          // console.log('dereference NEXT END');
          resultData[property] = dereference;
        } else {
          // console.log('dereference LAST',reference);
          resultData[property] = reference;
        }

      }
      // console.log('resultData ',resultData);
      return resultData;
    } else {
      return mainData;
    }
  }
}


// module.exports = {
//     default:LDPNavigator,
//     LDPNavigator
// };

export default LDPNavigator
