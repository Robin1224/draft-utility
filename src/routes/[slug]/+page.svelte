<script lang="ts">
    import { PartySocket } from 'partysocket';

    let { data } = $props();

    let socket : PartySocket;

    let username : string;
    let message : string;

    socket = new PartySocket({
        host: "localhost:1999",
        room: data.roomId,
    });

    socket.onmessage = (event) => {
        console.log(event.data);
    }

    socket.onopen = () => {
        console.log('Connected to party');
    }

    function sendMessage(message: string): void {
        socket.send(JSON.stringify({ message: message, username: username }));
    }
  
    let chat_history : string[] = [];
</script>

<button onclick={() => sendMessage("1")}>
    Send message 1
</button>

<style>
    button {
        background-color: #000;
        color: #fff;
        padding: 10px 20px;
        border-radius: 5px;
        border: none;
        cursor: pointer;
    }
</style>