const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
// 【关键修改1】告诉 multer：不要存进本地文件夹了，先把图片存在内存里交给我
const upload = multer({ storage: multer.memoryStorage() }); 

app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data.json');

const getMessages = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (e) {
        return [];
    }
};

const saveMessages = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

app.get('/api/messages', (req, res) => {
    res.json(getMessages());
});

// 【关键修改2】全新的发帖逻辑：接通 ImgBB API
app.post('/api/messages', upload.single('image'), async (req, res) => {
    try {
        const { text } = req.body;
        let imageUrl = null;

        // 如果同学上传了图片
        if (req.file) {
            // 将图片转换成一段超长的文本（Base64格式），这是 API 要求的格式
            const base64Image = req.file.buffer.toString('base64');
            
            // 你的 ImgBB 专属相册钥匙
            const API_KEY = '426e0569b926fd522ffcebffc5571495';
            
            // 打包数据
            const formData = new URLSearchParams();
            formData.append('image', base64Image);

            // 让服务器自动帮你把图片发给 ImgBB
            const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            const imgbbResult = await imgbbResponse.json();
            
            if (imgbbResult.success) {
                // 上传成功！拿回图片的永久网址
                imageUrl = imgbbResult.data.url; 
            }
        }

        const messages = getMessages();
        const newId = messages.length > 0 ? messages[0].id + 1 : 1;

        // 保存留言信息（注意：现在的 image 存的是永久网址了！）
        const newMessage = {
            id: newId,
            text: text,
            image: imageUrl, 
            time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kuala_Lumpur' })
        };

        messages.unshift(newMessage);
        saveMessages(messages);

        res.json({ success: true, message: newMessage });

    } catch (error) {
        console.error('服务器错误:', error);
        res.status(500).json({ success: false, error: '服务器出了点小问题' });
    }
});

// 让服务器优先听从云端的端口安排
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 服务器已启动！正在监听端口：${PORT}`);
});
