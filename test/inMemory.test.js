import LDPNavigator from './../src/index'

const context={ '@context':{
  "vocabulary": "http://example.org/vocab#",
  "vocabulary:linkedObject":{
    "@type":"@id"
  }
}}

const subject1 = {
  "@id":"http://example.org/myId1",
  "vocabulary:predicate":"object",
  "vocabulary:linkedObject":"http://example.org/myId2"
}

const subject2 = {
  "@id":"http://example.org/myId2",
  "vocabulary:predicate":"object",
  "vocabulary:linkedObject":[
    "http://example.org/myId1",
    "http://example.org/myId3"
  ]
}

const subject3 = {
  "@id":"http://example.org/myId3",
  "vocabulary:predicate":"object"
}

const dereferenceSubject1 = {
  "@context": {
    "pair": "http://virtual-assembly.org/ontologies/pair#",
    "pair:organizationOfMembership": { "@type": "@id" },
    "id": "@id",
    "type": "@type"
  },
  "id": "http://example.org/organizations/mon-orga",
  "type": "pair:Organization",
  "pair:label": "mon orga",
  "pair:organizationOfMembership": "http://example.org/membership-associations/1"
}

const dereferenceSubject2 = {
  "@context": {
    "pair": "http://virtual-assembly.org/ontologies/pair#",
    "pair:membershipActor": { "@type": "@id" },
    "pair:membershipRole": { "@type": "@id" },
    "id": "@id",
    "type": "@type"
  },
  "id":"http://example.org/membership-associations/1",
  "type":"pair:MembershipAssociation",
  "pair:membershipActor":"http://example.org/users/simon.louvet.zen",
  "pair:membershipRole":"http://example.org/membership-roles/role-1"
}


// test('create instance of ldpNavigator',()=>{
//   const ldpNavigator  = new LDPNavigator();
// });
//
// test('read literal from 1 subject',async ()=>{
//   const ldpNavigator  = new LDPNavigator();
//   const initSubject = {
//     ...context,
//     ...subject2
//   };
//   console.log('initSubject',initSubject);
//   await ldpNavigator.init(initSubject)
//   const inMemorySubject = await ldpNavigator.resolveById(initSubject['@id']);
//   console.log('inMemorySubject',inMemorySubject);
//   expect(inMemorySubject['@id']).toBe(initSubject['@id'])
//   const value = await ldpNavigator.get(inMemorySubject,'vocabulary:predicate');
//   expect(value).toBe(initSubject['vocabulary:predicate'])
// });
//
//
// test('init 2 subjects',async ()=>{
//   const ldpNavigator  = new LDPNavigator();
//   const initSubject = {
//     ...context,
//     "@graph":[
//       subject1,
//       subject2
//     ]
//   };
//   await ldpNavigator.init(initSubject)
//   const inMemorySubject1 = await ldpNavigator.resolveById(subject1['@id']);
//   expect(inMemorySubject1['@id']).toBe(subject1['@id']);
//   const inMemorySubject2 = await ldpNavigator.resolveById(subject2['@id']);
//   expect(inMemorySubject2['@id']).toBe(subject2['@id']);
//
// });
//
//
// test('read linked Object',async ()=>{
//   const ldpNavigator  = new LDPNavigator();
//   const initSubject = {
//     ...context,
//     "@graph":[
//       subject1,
//       subject2
//     ]
//   };
//   await ldpNavigator.init(initSubject)
//   const inMemorySubject1 = await ldpNavigator.resolveById(subject1['@id']);
//   const linkedObject = await ldpNavigator.get(inMemorySubject1,'vocabulary:linkedObject');
//   expect(linkedObject['@id']).toBe(subject2['@id']);
// });
//
// test('dereference linked Object a 1 depth',async ()=>{
//   const ldpNavigator  = new LDPNavigator();
//   const initSubject = {
//     ...context,
//     "@graph":[
//       subject1,
//       subject2
//     ]
//   };
//   await ldpNavigator.init(initSubject)
//   const inMemorySubject1 = await ldpNavigator.resolveById(subject1['@id']);
//   const dereferenced = await ldpNavigator.dereference(inMemorySubject1,{
//     p:'vocabulary:linkedObject'
//   });
//   expect(dereferenced['vocabulary:linkedObject']['@id']).toBe(subject2['@id']);
// });
//
// test('dereference linked Array Object a 1 depth',async ()=>{
//   const ldpNavigator  = new LDPNavigator();
//   const initSubject = {
//     ...context,
//     "@graph":[
//       subject1,
//       subject2,
//       subject3
//     ]
//   };
//   await ldpNavigator.init(initSubject)
//   const inMemorySubject2 = await ldpNavigator.resolveById(subject2['@id']);
//   const dereferenced = await ldpNavigator.dereference(inMemorySubject2,{
//     p:'vocabulary:linkedObject'
//   });
//   expect(dereferenced['vocabulary:linkedObject'].map(o=>o['@id'])).toContain(subject1['@id']);
//   expect(dereferenced['vocabulary:linkedObject'].map(o=>o['@id'])).toContain(subject3['@id']);
// });
//
// test('dereference linked Object a 2 depth',async ()=>{
//   const ldpNavigator  = new LDPNavigator();
//   const initSubject = {
//     ...context,
//     "@graph":[
//       subject1,
//       subject2,
//       subject3
//     ]
//   };
//   await ldpNavigator.init(initSubject)
//   const inMemorySubject1 = await ldpNavigator.resolveById(subject1['@id']);
//   const dereferenced = await ldpNavigator.dereference(inMemorySubject1,{
//     p:'vocabulary:linkedObject',
//     n:{
//       p:'vocabulary:linkedObject'
//     }
//   });
//   expect(dereferenced['vocabulary:linkedObject']['vocabulary:linkedObject'].map(o=>o['@id'])).toContain(subject3['@id']);
// });

test('dereference linked Object with id context ',async ()=>{
  const ldpNavigator  = new LDPNavigator();
  await ldpNavigator.init(dereferenceSubject1);
  await ldpNavigator.addToMemory(dereferenceSubject2);

  const inMemorySubject1 = await ldpNavigator.resolveById(dereferenceSubject1['id']);
  console.log('inMemorySubject1',dereferenceSubject1['id'],inMemorySubject1);
  expect(inMemorySubject1).toBeDefined();
  const dereferenced = await ldpNavigator.dereference(inMemorySubject1,{
    p:'pair:organizationOfMembership',
  });
  console.log('dereferenced',dereferenced);
  expect(dereferenced['pair:organizationOfMembership']['pair:membershipActor']).toBe("http://example.org/users/simon.louvet.zen");
});
