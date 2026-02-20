<script lang="ts">
    import { Avatar, type WithoutChildrenOrChild } from "bits-ui";
   
    let {
      src,
      alt,
      fallback = '?',
      ref = $bindable(null),
      imageRef = $bindable(null),
      fallbackRef = $bindable(null),
      ...restProps
    }: WithoutChildrenOrChild<Avatar.RootProps> & {
      src: string;
      alt: string;
      fallback?: string;
      imageRef?: HTMLImageElement | null;
      fallbackRef?: HTMLElement | null;
    } = $props();
  </script>
   
  <Avatar.Root {...restProps} class="size-8" bind:ref>
    <Avatar.Image {src} {alt} bind:ref={imageRef} class="rounded-full object-cover" />
    <Avatar.Fallback bind:ref={fallbackRef} class="size-8 rounded-full text-sm font-medium flex items-center justify-center bg-stone-200 text-stone-800">
      {fallback}
    </Avatar.Fallback>
  </Avatar.Root>