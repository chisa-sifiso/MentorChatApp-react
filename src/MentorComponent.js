import React, { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import './ChatStyles.css';

const MentorComponent = () => {
  const [connection, setConnection] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);

  const mentorId = "zwane"; // Unique mentor ID
  const recipientId = "sifiso"; // Recipient (mentee) ID

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`https://localhost:7215/communicationHub?userId=${mentorId}`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    newConnection.start()
      .then(() => {
        console.log("Connected to SignalR hub as Mentor");

        newConnection.on("ReceiveDirectMessage", (senderUserId, senderName, message, timestamp) => {
          setMessages(prevMessages => [
            ...prevMessages,
            { sender: senderName, message, timestamp }
          ]);
        });

        newConnection.on("ReceiveFileMessage", (senderUserId, senderName, base64File, fileType, timestamp) => {
          setMessages(prevMessages => [
            ...prevMessages,
            { sender: senderName, message: "[File Received]", timestamp, isFile: true, fileType, fileData: base64File }
          ]);
        });
      })
      .catch(err => console.error("Connection failed: ", err));

    setConnection(newConnection);

    return () => {
      newConnection.stop();
    };
  }, []);

  const handleSendMessage = async () => {
    if (newMessage.trim() && connection && connection.state === signalR.HubConnectionState.Connected) {
      const timestamp = new Date().toLocaleTimeString();
      const senderName = "Mentor";

      setMessages(prevMessages => [
        ...prevMessages,
        { sender: senderName, message: newMessage, timestamp }
      ]);

      try {
        await connection.invoke("SendDirectMessage", recipientId, mentorId, senderName, newMessage, timestamp);
        setNewMessage('');
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result.split(",")[1];
      const timestamp = new Date().toLocaleTimeString();
      const senderName = "Mentor";

      try {
        await connection.invoke("SendFileMessage", recipientId, mentorId, senderName, base64String, uploadedFile.type, timestamp);
        setMessages(prevMessages => [
          ...prevMessages,
          { sender: senderName, message: "[File Uploaded]", timestamp, isFile: true, fileType: uploadedFile.type, fileData: base64String }
        ]);
      } catch (error) {
        console.error("Error sending file:", error);
      }
    };
    reader.readAsDataURL(uploadedFile);
  };

  return (
    <div className="chat-container">
      <h3 className="chat-header">Mentor Chat (zwane)</h3>
      <div className="message-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === "Mentor" ? "mentor" : "mentee"}`}>
            <strong>{msg.sender}:</strong>
            {msg.isFile ? (
              msg.fileType.startsWith("image") ? (
                <img src={`data:${msg.fileType};base64,${msg.fileData}`} alt="Uploaded" />
              ) : (
                <a href={`data:${msg.fileType};base64,${msg.fileData}`} download>Download File</a>
              )
            ) : (
              <span>{msg.message}</span>
            )}
            <em>{msg.timestamp}</em>
          </div>
        ))}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>Send</button>
        <label htmlFor="file-upload" className="file-label">Choose File</label>
        <input id="file-upload" type="file" onChange={handleFileUpload} />
      </div>
    </div>
  );
};

export default MentorComponent;
