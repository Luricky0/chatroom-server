const express = require('express')
const app = express()
const server = require('http').Server(app)
const multer = require('multer')
const path = require('path')
const url = require('url')
const fs = require('fs')
const uuid = require('node-uuid')
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000"
    }
})
const cors = require('cors')
const jwt = require('jsonwebtoken')
const accountsService=require('./accounts')

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}))

io.on('connection', socket => {
    const id = socket.handshake.query.id
    socket.join(id)

    socket.on('send-message', ({ recipients, text }) => {
        recipients.forEach(recipient => {
            //为接收到信息的人正确设置信息接收人和发送者
            const newRecipients = recipients.filter(r => r !== recipient)
            newRecipients.push(id)
            socket.broadcast.to(recipient).emit('receive-message', {
                recipients: newRecipients,
                sender: id,
                text
            })
        })
    })

    socket.on('send-post', (post) => {
        post.recipients.forEach(recipient => {
            socket.broadcast.to(recipient).emit('receive-post', { ...post })
        })
    })

    socket.on('like-post', (post) => {
        const { posterId, UUID, likerId } = post
        post.recipients.push(posterId)
        post.recipients.forEach(recipient => {
            socket.to(recipient).emit('receive-like', {
                UUID: UUID,
                likerId: likerId
            })
        })
    })

    socket.on('dislike-post', (post) => {
        const { posterId, UUID, dislikerId } = post
        post.recipients.push(posterId)
        post.recipients.forEach(recipient => {
            socket.to(recipient).emit('cancel-like', {
                UUID: UUID,
                dislikerId: dislikerId
            })
        })
    })

    socket.on('send-comment', (data) => {
        const { UUID, posterId, recipients, text, commenterId } = data
        recipients.push(posterId)
        recipients.forEach(recipient => {
            socket.to(recipient).emit('receive-comment', {
                UUID,
                commenterId,
                text
            })
        })
    })
})

// app.post('/login', (req, res) => {
//     // 假设用户身份验证成功，生成令牌
//     const token = jwt.sign({ userId: req.body.id }, 'Token', { expiresIn: '1h' })
//     const refreshToken = jwt.sign({ userId: req.body.id }, 'RefreshToken')
//     // 将令牌发送给客户
//     res.json({ token, refreshToken })
// })
//
// // Refresh Token 验证中间件
// const authenticateRefreshToken = (req, res, next) => {
//     const refreshToken = req.body.refreshToken // 假设 Refresh Token 存储在请求体的 refreshToken 字段中
//
//     if (!refreshToken) {
//         return res.status(401).json({ message: '未提供 Refresh Token' })
//     }
//
//     // 验证 Refresh Token
//     jwt.verify(refreshToken, 'RefreshToken', (err, decoded) => {
//         if (err) {
//             return res.status(403).json({ message: 'RefreshToken 无效' })
//         }
//         // Refresh Token 验证通过，将解码后的用户信息保存到 req 对象中
//         req.user = decoded
//         next()
//     })
// }
//
// app.post('/update', authenticateRefreshToken, (req, res) => {
//     // Refresh Token 验证通过，生成新的 Access Token
//     const token = jwt.sign({ userId: req.user.userId }, 'Token', { expiresIn: '1h' })
//     // 将新的 Access Token 发送给客户端
//     res.json({ token })
// })

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './avatars')
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        const fileName = req.query.id + ext
        cb(null, fileName)
    }
})

const uploadFile = multer({ storage: storage })

app.post("/upload", uploadFile.single('avatar'), (req, res) => {
    // 构建文件的完整URL
    try {
        // 处理上传成功逻辑
        res.send("success")
    } catch (error) {
        // 处理上传失败逻辑
        res.status(500).send("Upload failed")
    }
})

app.get('/avatar', (req, res) => {
    const id = req.query.id

    const filePathJPG = path.resolve(__dirname, 'avatars', id + '.jpg') // 构建 JPG 文件路径
    const filePathPNG = path.resolve(__dirname, 'avatars', id + '.png') // 构建 PNG 文件路径
    const filePathJPEG = path.resolve(__dirname, 'avatars', id + '.jpeg') // 构建 JPG 文件路径


    let filePath = ''

    // 检查 JPG 文件是否存在
    if (fs.existsSync(filePathJPG)) {
        filePath = filePathJPG
    }
    // 检查 PNG 文件是否存在
    else if (fs.existsSync(filePathPNG)) {
        filePath = filePathPNG
    } else if (fs.existsSync(filePathJPEG)) {
        filePath = filePathJPEG
    }
    if (filePath !== '') {
        res.sendFile(filePath)
    } else {
        res.status(404).send("Avatar not found")
    }
})

//瞬间的贴文相关

const postimgStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './posts')
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        const newuuid = uuid.v4()
        const fileName = newuuid + ext
        cb(null, fileName)
    }
})

const uploadPostImgFile = multer({ storage: postimgStorage })
app.post('/uploadpostimg', uploadPostImgFile.single('file'), (req, res) => {
    // 构建文件的完整URL
    const newuuid = req.file.filename.split('.')[0]
    const resUrl = "http://localhost:4998/postimg?uuid=" + newuuid
    try {
        res.json({
            success: true,
            url: resUrl
        })
    } catch (error) {
        // 处理上传失败逻辑
        res.status(500).send("Upload failed")
    }
})

app.get('/postimg', (req, res) => {
    const uuid = req.query.uuid // 获取客户端传递的 UUID
    if (!uuid) {
        return res.status(400).send('Missing UUID')
    }

    const filePathJPG = path.resolve(__dirname, 'posts', uuid + '.jpg') // 构建 JPG 文件路径
    const filePathPNG = path.resolve(__dirname, 'posts', uuid + '.png') // 构建 PNG 文件路径
    const filePathJPEG = path.resolve(__dirname, 'posts', uuid + '.jpeg') // 构建 JPG 文件路径

    let filePath = ''

    // 检查 JPG 文件是否存在
    if (fs.existsSync(filePathJPG)) {
        filePath = filePathJPG
    }
    // 检查 PNG 文件是否存在
    else if (fs.existsSync(filePathPNG)) {
        filePath = filePathPNG
    } else if (fs.existsSync(filePathJPEG)) {
        filePath = filePathJPEG
    }
    res.sendFile(filePath, (err) => {
        if (err) {
            // 如果发送文件时出错，则返回错误响应
            console.error(err)
            res.status(500).send('Error sending file')
        }
    })
})
accountsService(app)


// 启动服务器
server.listen(4998, () => {
    console.log('Socket.IO server started on port 4998')
})