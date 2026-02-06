<script lang="ts"></script>
    import { PartySocket } from 'partysocket';

    let socket : PartySocket;

    let username : string;
    let message : string;
  
    let chat_history : string[] = [];
</script>

<button onclick={joinParty}>
    Join Party
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