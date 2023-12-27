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
let connectedUsers : Array<User> = [];
const managerUsers = new ManagerUser(connectedUsers);


setInterval(async () => {
  try {
    const requestFromToken = new ApiRequest(baseURL)

    const data: object  = {
      "email": "admin@admin.com",
      "password": "admin"
    }

    const responseFromToken = await requestFromToken.post<{ refresh: string,access: string }>('api/auth/token/login',data);

    const tokenAuthConfig: AuthConfig = {
      type: 'token',
      token: responseFromToken.access,
    };

    const requestFromListAlert = new ApiRequest(baseURL,tokenAuthConfig)

    const queryParams = {
      all: 'true',
    };

    const responseFromListAlert = await requestFromListAlert.get<{results: object[]}>('api/button/get/list/all?status=ocorrencia_iniciada&all=true',responseFromToken.access,queryParams)
    io.emit("list_alert",responseFromListAlert);

  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('Erro desconhecido:', JSON.stringify(error));
    }      
  }
}, 12000);


io.on("connection", (socket) => {
  const newUser: User = new User(socket.id);
  connectedUsers.push(newUser)

  socket.on("join_room",()=>{
    socket.join(fixedRoomName);
  })

  socket.on("alert",(mensagem)=>{
    socket.to(fixedRoomName).emit("new_alert",mensagem)
  })

  socket.on('create_room', (roomName) => {
    // Lógica para criar uma nova sala
    // Por exemplo, você pode simplesmente permitir que os usuários se juntem a qualquer sala que não exista atualmente
    if (!io.sockets.adapter.rooms.has(roomName)) {
      socket.join(roomName);
      console.log(`Nova sala criada: ${roomName}`);
    } else {
      console.log(`Sala ${roomName} já existe`);
    }
  });

  socket.on("join_room_alert",(uuid)=>{
    console.log(`se juntou a sala : ${uuid}`)
    socket.join(uuid)
  })

  socket.on("status_update",(data:{room:string,status: string})=>{
    const { room, status } = data
    console.log(data);
    socket.to(room).emit("new_status",status)
  })

  socket.on("disconnect",()=>{
    const disconnectedUser = socket.id;
    const newsUsers = managerUsers.disconnectUser(disconnectedUser);
    connectedUsers = newsUsers
    io.emit("user_connected",connectedUsers)
  })
  
  io.emit('user_connected', connectedUsers);
});

httpServer.listen(3001);