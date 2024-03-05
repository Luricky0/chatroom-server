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
                res.statusCode=404
                console.log('user not exist')
                res.end('failed')
                return
            }
            const realpassword=user.password
            if(realpassword===password){
                res.statusCode=200
                res.end('success')
            }else{
                res.statusCode=401
                res.end('success')
            }
        }).catch(err=>{
            if(err){
                console.log('find error',err)
                res.statusCode=500
                res.end('failed')
                return
            }
        })
    })
}
async function RunAccountsService(app){
    const uri="mongodb://localhost:27017/chatroom"
    const client=new MongoClient(uri)
    await client.connect()
    const db=client.db()
    const usersCollection=db.collection('users')
    addLoginListener(app,usersCollection)
}

module.exports=RunAccountsService