const {MongoClient}=require('mongodb')
const express = require('express')

function addLoginListener(app,users){
    app.use(express.json());
    //登录操作
    app.post('/login',(req,res)=>{
        const data = req.body
        console.log("data",data)
        const { uuid, password } = data
        users.findOne( {uuid:uuid})
            .then((user)=>{
            if(!user){
                console.log('user not exist')
                res.status(404).end('failed')
                return
            }
            const realpassword=user.password;
                console.log(realpassword===password)
            if(realpassword===password){
                res.status(200).end('success')
            }else{
                res.status(401).end('success')
            }
        }).catch(err=>{
            if(err){
                console.log('find error',err)
                res.status(500).end('failed')
                return
            }
        })
    })
}
function addRegisterListener(app,users,nextAssignedIdCollection){
    app.use(express.json());
    app.post('/register',(req,res)=>{
        const data=req.body
        const {password} = data
        let nextAssignedId
        nextAssignedIdCollection.findOne({})
            .then(nextAssignedIdDoc=>{
                nextAssignedId = nextAssignedIdDoc.value
                console.log(nextAssignedId)

                users.insertOne({uuid:nextAssignedId.toString(),password:password})
                    .then(user=>{

                        nextAssignedIdCollection.updateOne(
                            {value: nextAssignedId},
                            {$set:{value: nextAssignedId+1}}
                        ).catch(err=>console.log('update err'))

                        res.status(200).send(nextAssignedId.toString())

                    })
                    .catch(err=>console.log('insert error'))

            })
            .catch(err=>console.log('find nextAssigned Id error'))

    })

}
async function RunAccountsService(app){
    const uri="mongodb://localhost:27017/chatroom"
    const client=new MongoClient(uri)
    await client.connect()
    const db=client.db()

    const usersCollection=db.collection('users')
    const nextAssignedIdCollection=db.collection('nextAssignedId')

    addLoginListener(app,usersCollection)
    addRegisterListener(app,usersCollection,nextAssignedIdCollection)

}

module.exports=RunAccountsService