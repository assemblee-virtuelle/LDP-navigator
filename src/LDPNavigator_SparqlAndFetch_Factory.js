'use strict';
import LDPNavigator from './LDPNavigator' ;
import FetchAdapter from './adapter/FetchAdapter';
import SparqlAdapter from './adapter/SparqlAdapter';

class LDPNavigator_SparqlAndFetch_Factory {
  constructor(config) {
    this.config=config;

  }

  make(adapterClasses){

    const config =this.config;
    const ldpNavigator=new LDPNavigator(config);
    let adapters=[
      new SparqlAdapter(config?config.sparql:undefined),
      new FetchAdapter(config?config.fetch:undefined)
    ];
    ldpNavigator.setAdapters(adapters)
    return ldpNavigator;
  }
}

export default LDPNavigator_SparqlAndFetch_Factory;
