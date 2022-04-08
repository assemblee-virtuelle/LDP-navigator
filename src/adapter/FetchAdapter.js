'use strict';
import jsonld from 'jsonld';

class FetchAdapter {
  constructor(config) {
    this.config=config;
  }

  async resolveById(id){
    // console.log('id',id);
    // console.log('fetch ',id);
    try {
      const response = await fetch(id,{headers:this.config?this.config.headers:{}});
      // console.log(response.status);
      if (response.status==200){
        const result = await response.json();
        const framed = await jsonld.frame(result,{"@id":id});
        // console.log('fetch result',result);
        // console.log('framed',framed);


        return framed;
      }else{
        return undefined;
      }
    } catch (e) {
      console.error('error fetching ',id);
      console.error(e);
      return undefined;
    }



  }
}

export default FetchAdapter;
