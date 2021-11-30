'use strict';

class SparqlAdapter {
  constructor(config) {
    this.config=config;
  }

  async resolveById(id){
    const response = await fetch('http://dfc-middleware:3000/sparql', {
      method: 'POST',
      body: `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dfc: <http://static.datafoodconsortium.org/ontologies/DFC_FullModel.owl#>
      PREFIX dfc-b: <http://static.datafoodconsortium.org/ontologies/DFC_BusinessOntology.owl#>
      PREFIX dfc-p: <http://static.datafoodconsortium.org/ontologies/DFC_ProductOntology.owl#>
      PREFIX dfc-t: <http://static.datafoodconsortium.org/ontologies/DFC_TechnicalOntology.owl#>
      PREFIX dfc-u: <http://static.datafoodconsortium.org/data/units.rdf#>
      PREFIX dfc-pt: <http://static.datafoodconsortium.org/data/productTypes.rdf#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      CONSTRUCT  {
        ?s1 ?p1 ?o1 .
      }
      WHERE {
        BIND(<${id}> AS ?s1) .
        ?s1 ?p1 ?o1 .
      }
      `,
      headers: {
        'accept': 'application/ld+json'
      }
    });
    const result =await response.json();
    // console.log('result',result);
    return  result;
  }
}

export default SparqlAdapter;
