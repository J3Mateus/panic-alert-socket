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
const baseURL = process.env.URL_BACK_END || 'http://localhost:3000';
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

    const responseFromListAlert = await requestFromListAlert.get<{results: object[]}>('api/button/get/list/all?offset=5&limit=5',responseFromToken.access,queryParams)
    io.emit("list_alert",responseFromListAlert.results);

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


  socket.on("disconnect",()=>{
    const disconnectedUser = socket.id;
    const newsUsers = managerUsers.disconnectUser(disconnectedUser);
    connectedUsers = newsUsers
    io.emit("user_connected",connectedUsers)
  })
  
  io.emit('user_connected', connectedUsers);
});

httpServer.listen(3000);