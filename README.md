# ldp-navigator

## concepte
ldp-navigator est un bibliothèque conçue pour faciliter la navigation dans des données ldp. Elle est massivement basé sur json-ld.

### InMemory
Le fonctionnement fondamentale n'utilise pas de persistance ni de cache et n'est pas en capacité de faire un fetch ldp. il permet d'initiliser une instance avec un jeux de données json-ld, de naviguer dans celui-ci et de d'obtenir des grappe d'objet comparable à la forme framed du jeux de donnée initiale depuis n'importe quel sujet de ce jeux de donnée.

### Adapters
Les adapters permettent de compléter le noyau InMemory avec des capacité de connection et d'interopérabilité. La navigation sur des sujets, non encore chargé dans l'instance, est alors assimillable à du deréférencement.
deux méthodes sont implémentable dans un adapter
- resolveById : recherche un sujet par son id.
- persist : persister un sujet pour le retrouver au prochain resolveById. ** not implemented **

Les adapters sont cumulables et affectés avec ```setAdapters()```. Il sont appelé dans l'ordre du tableau passé en parametre.

#### FetchAdapter
Il permet de requeter l'uri d'un sujet qui n'est pas encore InMemory. Le header est configurable pour permettre des authentificaitons ou d'autres parametres.
** persist N/A **

#### SparqlAdapter
Il permet requeter un endpoint Sparql http pour trouver un sujet qui n'est pas encore InMemory. Le endpoint est configurable.

#### localStorageAdapter
** Not implemented yet**
Il permet de requetter dans le localStorage du navigateur un sujet qui n'est pas encore InMemory.
