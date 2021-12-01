# ldp-navigator
ldp-navigator est un bibliothèque conçue pour faciliter la navigation dans des données ldp. Elle est massivement basé sur json-ld.

## InMemory
Le fonctionnement fondamentale n'utilise pas de persistance ni de cache et n'est pas en capacité de faire un fetch ldp. il permet d'initiliser une instance avec un jeux de données json-ld, de naviguer dans celui-ci et de d'obtenir des grappe d'objet comparable à la forme framed du jeux de donnée initiale depuis n'importe quel sujet de ce jeux de donnée.

## Usage
### Import
import ES6. ldp-navigator est un module ES6.
```
import LDPNavigator from 'ldp-navigator'
```
Si votre projet ne supporte pas les import ES6 vous pouvez passez par 'fix-esm'
```
 const LDPNavigator = require("fix-esm").require('ldp-navigator')
```
### Jeux d'essai
code commun utilisé pour tous les examples
```
const ldpNavigator  = new LDPNavigator();
const initSubject = {
  "@context" :{
    "vocabulary": "http://example.org/vocab#",
    "vocabulary:linkedObject":{
      "@type":"@id"
    }
  },
  "@graph":[
    {
      "@id":"myId1",
      "vocabulary:predicate":"object",
      "vocabulary:linkedObject":"myId2"
    },
    {
      "@id":"myId2",
      "vocabulary:predicate":"object",
      "vocabulary:linkedObject":[
        "myId1",
        "myId3"
      ]
    },
    {
      "@id":"myId3",
      "vocabulary:predicate":"object"
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
  "@id":"myId1",
  "vocabulary:predicate":"object",
  "vocabulary:linkedObject":"myId2"
}
```

### get
```
const inMemorySubject1 = await ldpNavigator.resolveById('myId1');
const linkedObject = await ldpNavigator.get(inMemorySubject1,'vocabulary:linkedObject');
expect(linkedObject['@id']).toBe(subject2['@id']);
```
linkedObject
```
{
  "@id":"myId2",
  "vocabulary:predicate":"object",
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
  "@id":"myId1",
  "vocabulary:predicate":"object",
  "vocabulary:linkedObject":{
    "@id":"myId2",
    "vocabulary:predicate":"object",
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
  "@id":"myId2",
  "vocabulary:predicate":"object",
  "vocabulary:linkedObject":[
    {
      "@id":"myId1",
      "vocabulary:predicate":"object",
      "vocabulary:linkedObject":"myId2"
    },
    {
      "@id":"myId3",
      "vocabulary:predicate":"object"
    }
  ]
}
```
dereferenced3
```
{
  "@id":"myId1",
  "vocabulary:predicate":"object",
  "vocabulary:linkedObject":{
    "@id":"myId2",
    "vocabulary:predicate":"object",
    "vocabulary:linkedObject":[
      {
        "@id":"myId1",
        "vocabulary:predicate":"object",
        "vocabulary:linkedObject":"myId2"
      },
      {
        "@id":"myId3",
        "vocabulary:predicate":"object"
      }
    ]
  }
}
```

### config
#### forceArray

```
const ldpNavigator  = new LDPNavigator({
    forceArray=['vocabulary:linkedObject']
  });
```

dereferenced1
```
{
  "@id":"myId1",
  "vocabulary:predicate":"object",
  "vocabulary:linkedObject":[
    {
      "@id":"myId2",
      "vocabulary:predicate":"object",
      "vocabulary:linkedObject":[
        "myId1",
        "myId3"
      ]
    }
  ]
}
```

## Adapters
Les adapters permettent de compléter le noyau InMemory avec des capacité de connection et d'interopérabilité. La navigation sur des sujets, non encore chargé dans l'instance, est alors assimillable à du deréférencement.
deux méthodes sont implémentable dans un adapter
- resolveById : recherche un sujet par son id.
- persist : persister un sujet pour le retrouver au prochain resolveById. *not implemented*

Les adapters sont cumulables et affectés avec ```setAdapters()```. Il sont appelé dans l'ordre du tableau passé en parametre. Une instance de ldp-navigator avec ou sans adapters se manipule de manière identique. Les adpaters vont permettre de rechercher des données hors de la mémoire de l'instance et de les persister pour les retourver plus tard sans dependre du cyle de vie de l'instance.

### FetchAdapter
Il permet de requeter l'uri d'un sujet qui n'est pas encore InMemory. Le header est configurable pour permettre des authentificaitons ou d'autres parametres.
*persist N/A*

### SparqlAdapter
Il permet requeter un endpoint Sparql http pour trouver un sujet qui n'est pas encore InMemory. Le endpoint est configurable.

### localStorageAdapter
*Not implemented*
Il permet de requetter dans le localStorage du navigateur un sujet qui n'est pas encore InMemory.
