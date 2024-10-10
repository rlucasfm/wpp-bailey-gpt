const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const { OpenAI } = require('openai')

const openai = new OpenAI({apiKey: '####'})

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update

        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('opened connection')
        }
    })

    sock.ev.on('messages.upsert', async m => {
        const message = m.messages[0]
        
        if (message.message.imageMessage) {
            console.log('Imagem ', message.message.imageMessage.url)
            console.log('Legenda da Imagem ', message.message.imageMessage.caption)
        }
        else if (message.message.stickerMessage) {
            console.log('Sticker ', message.message.stickerMessage.url);
        } else {
            const prompt_message = message.message.conversation;
            console.log('Mensagem recebida ', prompt_message);

            if (prompt_message.split(' ')[0] === '/prompt') { 
                const prompt = prompt_message.replace('/prompt ', '');
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Você é um útil assistente pessoal, inocente e engraçado. Você é um robô divertido criado por Richard Lucas com o objetivo de ser um companheiro e ajudante diário. Soe de forma espontânea e adulta." },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                });
                sock.sendMessage(message.key.remoteJid, { text: completion.choices[0].message.content })
             }
        }

        console.log('De ', message.pushName)
    })

    sock.ev.on ('creds.update', saveCreds)
}
// run in main file
connectToWhatsApp()