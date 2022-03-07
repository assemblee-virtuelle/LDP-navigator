'use strict';

class FetchAdapter {
  constructor(config) {
    this.config=config;
  }

  async resolveById(id){
    // console.log('id',id);
    // console.log('fetch ',id);
    const response = await fetch(id,{headers:this.config?this.config.headers:{}});
    // console.log(response.status);
    if (response.status==200){
      const result = await response.json();
      // console.log('fetch result',result);
      return result;
    }else{
      return undefined
    }


  }
}

export default FetchAdapter;
