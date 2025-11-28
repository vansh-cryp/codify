const express = require("express");
const open = require("open");
const vscode = require('vscode');
require("dotenv").config();
const crypto = require("crypto");
const PORT = process.env.PORT || 8888;
const app = express();

//starts the seriver and listen to the given port
const server = app.listen(PORT,'127.0.0.1',()=>{
    console.log(`Auth server running on https://127.0.0.1:${PORT}`);
})

//this is used to let us get back to vs code after authentication
app.get('/callback',(req,res)=>{
    const{code,state,error} = req.query;
    if(error){
        vscode.window.showErrorMessage('Authentication failed');
        return res.send("Authentication failed");
    }
    if(!state){
        vscode.window.showErrorMessage('state mismatch in authentification');
        return res.send("Authentication failed:State Mismatch");
    }
     vscode.window.showInformationMessage('Successfully authenticated with Spotify!');
    res.send('Authentication successful! You can close this window and return to VS Code.');
    server.close();
})


function generateRandomString(length){
    return  crypto.randomBytes(Math.ceil(length/2)).toString('hex').slice(0,length);
}

async function authenticate(){
    const state = generateRandomString(16);
    const scopes = ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'];
    const authUrl = `https://accounts.spotify.com/authorize?client_id
    =${process.env.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=
    ${process.env.SPOTIFY_REDIRECT_URI}&state=${state}&scope=
    ${encodeURIComponent(scopes.join(' '))}`;
    await open(authUrl);

}

//let us use this funciton in other files
module.exports = {authenticate}