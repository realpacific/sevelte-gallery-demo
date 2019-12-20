<script>
    export let asset;

    function open() {
        window.open(asset.url, '_blank');
    }


</script>

<main class="col-4" on:click={open}>
    <div class="card">
        <img src="{asset.downloadUrl}" alt={asset.author}>
    </div>
</main>

<style>
    main {
        padding: 10px;
    }

    img {
        max-height: 50vh;
        border-radius: 20px;
        transition: 0.2s ease-in-out;
    }

    img:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 3px rgba(0, 0, 0, 0.2);
    }

    .card {
        background-color: #fff;
        color: #35373a;
        max-height: 50vh;
        border-radius: 20px;
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.06);
    }

</style>
