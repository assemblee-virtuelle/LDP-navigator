ldp-navigator
====

ldp-navigator is a library designed to facilitate navigation in [LDP](https://www.w3.org/TR/ldp/) data. It is massively based on [JSON-LD](https://json-ld.org/) technology and [jsonld librairy](https://www.npmjs.com/package/jsonld).
ldp-navigator is functionally similar to [LDFlex](https://github.com/LDflex/LDflex) but is intended to be minimalist. It is also based on object logic rather than SPARQL logic. Adapters can be something other than SPARQL endpoints and are agnostic (not [communica](https://github.com/comunica/comunica/) dependent). The authentication mechanics of the SparqlAdapter and FetchlAdapter are free (solid-auth-client for communica) and easy to configure while being compatible (a CommunicaAdapter is quite possible).

ldp-navigator was created as part of the [Data Food Consortium](http://www.datafoodconsortium.org/) project. It was published and it is maintained by [Virtual Assembly](https://www.virtual-assembly.org/) as a stand-alone package.

## InMemory
The basic operation does not use persistence or cache and is not able to do an LDP fetch. It allows to initialize an instance with a JSON-LD dataset, to browse it and to get clusters of objects comparable to the framed form of the initial dataset from any subject of this dataset.

## Usage
### Import
import ES6. ldp-navigator is an ES6 module.
```
import LDPNavigator from 'ldp-navigator
```
If your project does not support ES6 imports, you can use 'fix-esm'.
```
 const LDPNavigator = require("fix-esm").require('ldp-navigator')
```
### Test Sets
common code used for all examples
```
const ldpNavigator = new LDPNavigator();
const initSubject = {
  "@context" :{
    "vocabulary": "http://example.org/vocab#",
    "vocabulary:linkedObject":{
      "@type":"@id"
    }
  },
  "@graph":[
    {
      "@id": "myId1",
      "vocabulary:predicate": "object",
      "vocabulary:linkedObject": "myId2"
    },
    {
      "@id": "myId2",
      "vocabulary:predicate": "object",
      "vocabulary:linkedObject":[
        "myId1",
        "myId3"
      ]
    },
    {
      "@id": "myId3",
      "vocabulary:predicate": "object"
    }
  ]
};
await ldpNavigator.init(initSubject)
```
### resolveById
```
const inMemorySubject1 = await ldpNavigator.resolveById('myId1');
```
inMemorySubject1
```
{
  "@id": "myId1",
  "vocabulary:predicate": "object",
  "vocabulary:linkedObject": "myId2"
}
```

### get
```
const inMemorySubject1 = await ldpNavigator.resolveById('myId2');
const linkedObject = await ldpNavigator.get(inMemorySubject1,'vocabulary:linkedObject');
```
linkedObject
```
{
  "@id": "myId2",
  "vocabulary:predicate": "object",
  "vocabulary:linkedObject":[
    "myId1",
    "myId3"
  ]
}
```

### dereference
```
const inMemorySubject1 = await ldpNavigator.resolveById('myId1');
const inMemorySubject2 = await ldpNavigator.resolveById('myId2');
const dereferenced1 = await ldpNavigator.dereference(inMemorySubject1,{
  p:'vocabulary:linkedObject'
});
const dereferenced2 = await ldpNavigator.dereference(inMemorySubject2,{
  p:'vocabulary:linkedObject'
});
const dereferenced3 = await ldpNavigator.dereference(inMemorySubject1,{
  p:'vocabulary:linkedObject',
  n:{
    p:'vocabulary:linkedObject'
  }
});
```
dereferenced1
```
{
  "@id": "myId1",
  "vocabulary:predicate": "object",
  "vocabulary:linkedObject":{
    "@id": "myId2",
    "vocabulary:predicate": "object",
    "vocabulary:linkedObject":[
      "myId1",
      "myId3"
    ]
  }
}
```
dereferenced2
```
{
  "@id": "myId2",
  "vocabulary:predicate": "object",
  "vocabulary:linkedObject":[
    {
      "@id": "myId1",
      "vocabulary:predicate": "object",
      "vocabulary:linkedObject": "myId2"
    },
    {
      "@id": "myId3",
      "vocabulary:predicate": "object"
    }
  ]
}
```
dereferenced3
```
{
  "@id": "myId1",
  "vocabulary:predicate": "object",
  "vocabulary:linkedObject":{
    "@id": "myId2",
    "vocabulary:predicate": "object",
    "vocabulary:linkedObject":[
      {
        "@id": "myId1",
        "vocabulary:predicate": "object",
        "vocabulary:linkedObject": "myId2"
      },
      {
        "@id": "myId3",
        "vocabulary:predicate": "object"
      }
    ]
  }
}
```

### config
#### forceArray

```
const ldpNavigator = new LDPNavigator({
    forceArray=['vocabulary:linkedObject']
  });
```

dereferenced1
```
{
  "@id": "myId1",
  "vocabulary:predicate": "object",
  "vocabulary:linkedObject":[
    {
      "@id": "myId2",
      "vocabulary:predicate": "object",
      "vocabulary:linkedObject":[
        "myId1",
        "myId3"
      ]
    }
  ]
}
```

## Adapters
Adapters allow to complete the InMemory core with connection and interoperability capabilities. Browsing on topics, not yet loaded in the instance, is then comparable to dereferencing.
Two methods can be implemented in an adapter:
- resolveById: search a topic by its id.
- persist : persist a topic to find it at the next resolveById. *not implemented*

Adapters are cumulative and assigned with ``setAdapters()``. They are called in the order of the array passed as parameters.
An instance of ldp-navigator with or without adapters is used in the same way. The adpaters will allow to look for data outside the memory of the instance and to persist them to return them later without depending on the life cycle of the instance.

### FetchAdapter
It allows you to request the uri of a subject that is not yet InMemory. The headers are configurable to allow authentications or other parameters.
*persist N/A*

### SparqlAdapter

It allows querying a Sparql http endpoint to find a topic that is not yet InMemory. The endpoint, prefix and headers are configurable.

### localStorageAdapter
It allows you to query the browser's localStorage for a topic that is not yet InMemory.
*Not implemented*

Translated with www.DeepL.com/Translator (free version).
