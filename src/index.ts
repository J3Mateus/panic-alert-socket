import  express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import 'dotenv/config'
import ManagerUser from "./utils/managerUsers";
import User from "./model/user";
import ApiRequest from "./utils/request";
import AuthConfig from "./utils/types/authConfig";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { 
  cors:{
    origin:'*'
  }
 });

const fixedRoomName = "panicRoom"; // Defina o nome fixo da sala aqui
const baseURL = process.env.URL_BACK_END || 'http://localhost:8000';
const port = process.env.PORT || 3002 
let connectedUsers : Array<User> = [];
const managerUsers = new ManagerUser(connectedUsers);



io.on("connection", (socket) => {
  const newUser: User = new User(socket.id);
  connectedUsers.push(newUser)

  socket.on("join_room",()=>{
    socket.join(fixedRoomName);
  })

  socket.on("alert",(mensagem)=>{
    socket.to(mensagem.countie.id).emit("new_alert",mensagem)
  })

  socket.on('create_room', (roomName) => {
    console.log("Criando sala:"+roomName)
    // Lógica para criar uma nova sala
    // Por exemplo, você pode simplesmente permitir que os usuários se juntem a qualquer sala que não exista atualmente
    if (!io.sockets.adapter.rooms.has(roomName)) {
      socket.join(roomName);
    } 
  });

  socket.on("join_room_alert",(uuid)=>{
    socket.join(uuid)
  })

  socket.on("status_update",(data:{room:string,status: string})=>{
    const { room, status } = data
    socket.to(room).emit("new_status",status)
  })

  socket.on("update_item_in_list_alert", (data) => {
    // Lógica para atualizar a lista com os dados recebidos
    io.emit("update_list_alert"); // Emitir uma nova lista para o cliente
  });

  socket.on("disconnect",()=>{
    const disconnectedUser = socket.id;
    const newsUsers = managerUsers.disconnectUser(disconnectedUser);
    connectedUsers = newsUsers
    io.emit("user_connected",connectedUsers)
  })
  
  io.emit('user_connected', connectedUsers);
});

httpServer.listen(port,()=>{
  console.log(`Rodando aplicação na porta ${port}`)
});