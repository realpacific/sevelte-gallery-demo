<script>
    import Asset from "./asset";
    import Gallery from "./Gallery.svelte";

    const fetchAssets = (async function () {
        const response = await fetch(`https://picsum.photos/v2/list?page=1&limit=30`);
        const body = await response.json();
        return body.map(res => new Asset(res['author'], res['width'], res['height'], res['url'], res['download_url']));
    })();

</script>
<svelte:head>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
</svelte:head>

<main class="container">
    <div class="row">
        {#await fetchAssets}
            <p>Waiting...</p>
        {:then data}
            {#each data as asset}
                <Gallery class="gallery" asset="{asset}"/>
            {/each}
        {:catch error}
            <p>An error occurred! {error}</p>
        {/await}
    </div>
</main>

<style>

    .gallery {
        max-width: 33%;
    }
</style>
