import Layout from '@/components/Layout';
import Image from 'next/image';
import { useRouter } from 'next/router';

const apiPath = 'https://react.webworker.berlin/wp-json/wp/v2/';

/* Wenn man einen dynamischen Pfad hat, muss man Next mitteilen,
welche Pfade das System statisch generieren soll, hier also
eine Liste der vorhanden Blog-Slugs übergeben.
https://nextjs.org/docs/basic-features/data-fetching/get-static-paths
*/
export async function getStaticPaths() {
  let paths = [];

  try {
    const response = await fetch(`${apiPath}posts`);

    if (!response.ok) {
      throw new Error('Fehler beim Laden der Pfade');
    }

    const posts = await response.json();
    /* 
      Der Schlüsselname "params" ist vorgegeben. Der Schlüsselname
      "slug" entspricht dem Platzhalter [slug] im Dateinamen von [slug].jsx
      Die Einträge im paths-Array werden an getStaticProps übergeben,
      so dass für jeden Eintrag eine Seite generiert werden kann.
      https://nextjs.org/docs/api-reference/data-fetching/get-static-paths
      */
    paths = posts.map(({ slug }) => ({ params: { slug } }));
  } catch (error) {
    console.log(error);
  }

  return { paths, fallback: true };
}

export async function getStaticProps({ params }) {
  /* 
  Hier wieder in Try-Catch Daten holen, und zwar die Daten zu einem Blogbeitrag
  mit Hilfe des Slugs, welcher in params.slug steckt.
  Der URL-Parameter lautet ?slug=slug
  Achtung: Es kommt trotzdem ein Array zurück, allerding einer mit 
  nur einem Eintrag.
  
  */
  let post = {};

  try {
    const response = await fetch(`${apiPath}posts?slug=${params.slug}`);
    if (!response.ok) {
      throw new Error('Problem!');
    }

    const posts = await response.json();

    post = posts[0];

    /* 1. Prüft, ob featured_media in post vorhanden ist.
2. Wenn ja, ruft mit der ID getTitleImage auf und speichert
die Antwort unter post.titleImage
*/
    if (post.featured_media) {
      post.titleImage = await getTitleImage(post.featured_media);
    }
  } catch (error) {
    console.log(error);
  }

  return {
    props: {
      post,
    },
    revalidate: 3600, // Einmal pro Stunde aktualisieren
  };
}

export default function BlogPost({ post }) {
  // https://nextjs.org/docs/basic-features/data-fetching#fallback-pages
  const router = useRouter();

  if (router.isFallback) {
    return (
      <Layout>
        <strong>Wird geladen…</strong>
      </Layout>
    );
  }

  return (
    <Layout title={post.title.rendered}>
      {/* 
      1. Prüfen, ob ein Bild vorhanden ist.
      2. Wenn ja, Bilddaten nutzen, um ein Image-Element (Next Image-Komponente)
      darzustellen.
      */}
      {post.titleImage && (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image {...post.titleImage} sizes="(max-width: 52rem) 90vw, 48rem" />
      )}

      <div dangerouslySetInnerHTML={{ __html: post.content.rendered }} />
    </Layout>
  );
}

async function getTitleImage(imageId) {
  try {
    const response = await fetch(`${apiPath}media/${imageId}`);

    if (!response.ok) {
      throw new Error('Fehler beim Laden der Bilddaten!');
    }

    const imageData = await response.json();

    return {
      src: imageData.guid.rendered,
      width: imageData.media_details.width,
      height: imageData.media_details.height,
      alt: imageData.alt_text,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
  /* 
1. Holt mit Hilfe der ID die Daten für das entsprechende Bild.
2. Gebt ein Objekt zurück, welches nur ausgesuchte Daten enthält:
{
  src: "",
  width: "",
  height: "",
  alt: ""
}
*/
}
