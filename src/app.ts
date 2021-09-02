import dotenv from "dotenv";
import { Context } from "grammy";
import bot from "./config/require";
import axios from "axios";
dotenv.config();

// process.env.ACCESS_TOKEN =
//   "BQCA-FbOFeYazCU4xA1Mkl_5AnQ-Gv6ptRBah-oyaJ9tzYUy5T3Dw7zZmpKxODOIMbmpjilU-72UdOJusOY8BMUgGN5EkZDnXqNlemJB15CZ9xScFTWeuDnuEoAzVXLsgP1k8diBrvVetaVBVxgptWuGsEvATbiaQ-LCy0aI9qGnhgxw3zfcvfBh5w";

let curl = `grant_type=refresh_token&refresh_token=${process.env.REFRESH_TOKEN}`;

let handleRefreshToken = async () => {
  try {
    let { data } = await axios.post(
      "https://accounts.spotify.com/api/token",
      curl,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${process.env.base64EncodedClientIDClientSecret}`,
        },
      }
    );
    process.env.ACCESS_TOKEN = data.access_token;
    // console.log(process.env.ACCESS_TOKEN);
  } catch (e: any) {}
};
if (!process.env.ACCESS_TOKEN) {
  handleRefreshToken();
} else {
  setInterval(() => {
    handleRefreshToken();
  }, 3550 * 1000);
}

bot.on("inline_query", async (ctx: Context) => {
  let inlineQ = ctx.inlineQuery;
  try {
    let res = await axios.get(
      `https://api.spotify.com/v1/search?q=${inlineQ?.query}&type=track&limit=10`,
      {
        headers: {
          authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          "content-type": "application/json",
        },
      }
    );
    let tracks = res.data.tracks.items;
    tracks = tracks
      .map((item: any) => {
        if (item?.preview_url !== null) {
          // console.log(item.artists.map(artist:any) => )
          return {
            type: "audio",
            audio_file_id: `${item.id}`,
            audio_url: item?.preview_url,
            caption: `
🎸 موسیقی : ${item.name}

🎤 خواننده : ${item.artists.map((artist: any) => artist.name).join(" - ")}

📁 آلبوم : ${item.album.name}

🕓 زمان(ثانیه) : ${Math.floor(item.duration_ms / 1000) || "نامعلوم"}

📅 تاریخ پخش آلبوم : ${new Date(item.album.release_date).toLocaleDateString(
              "fa-IR"
            )}

⌛️ زمان دقیق پخش آلبوم : ${
              item.album.release_date_precision === "day" ? "روز" : "شب"
            }

🔢 تعداد تِرک های آلبوم : ${item.album.total_tracks}

آیدی : #${item.id}#${item.artists.map((artist: any) => artist.id).join("#")}

درحال جمع آوری و ارسال موسیقی های مشابه، لطفا صبر کنید....

#نکته_مهم❗️
برای دریافت موسیقی های مشابه باید حتما در همین ربات این موزیک را جستجو و ارسال کرده باشید.
`,

            audio_duration: Math.floor(30 / 1000),
            id: item.id,
            title: `${item.name} / ${item.artists
              .map((artist: any) => artist.name)
              .join(" - ")}`,
          };
        }
        return "";
      })
      .filter((item: any) => item !== "");
    bot.api.answerInlineQuery(inlineQ?.id!, tracks);
  } catch (e) {
    // console.log(e);
  }
});

bot.on(":audio", async (ctx: Context) => {
  let msg =
    ctx.channelPost?.caption ?? ctx.message?.caption ?? ctx.msg?.caption;
  let b: string[] = msg!.split(":")!;
  try {
    b = b[b?.length - 1].split("#");
    b = b
      .map((item) =>
        item
          .trim()
          .match(/[0-9a-z]/gi)
          ?.join("")
      )
      .filter((item) => item) as string[];
    let songId = b[0];
    let ENDPOINT_RECOMMENDED_MUSICS = `https://api.spotify.com/v1/recommendations?seed_tracks=${songId}&seed_artists=${b
      .filter((_, index) => index !== 0)
      .join(
        ","
      )}&seed_genres=&limit=99&target_instrumentalness=0&target_energy=0.51&target_valence=0.84&target_danceability=0.81&target_acousticness=0.12`;
    try {
      const { data } = await axios.get(ENDPOINT_RECOMMENDED_MUSICS!, {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
      });
      ctx.editMessageCaption({
        caption: msg!
          .split("\n")
          .filter((item: any) => !item.includes("#"))
          .join("\n"),
      });
      let tracks = data.tracks;
      tracks.slice(0, 10).forEach((item: any) => {
        if (item.preview_url !== null) {
          ctx.replyWithAudio(item.preview_url, {
            caption: `
  🎸 موسیقی : ${item.name}
  🎤 خواننده : ${item.artists.map((artist: any) => artist.name).join(" - ")}
  📁 آلبوم : ${item.album.name}
  🕓 زمان(ثانیه) : ${Math.floor(item.duration_ms / 1000) || "نامعلوم"}
  📅 تاریخ پخش آلبوم : ${new Date(item.album.release_date).toLocaleDateString(
    "fa-IR"
  )}
  ⌛️ زمان دقیق پخش آلبوم : ${
    item.album.release_date_precision === "day" ? "روز" : "شب"
  }
  🔢 تعداد تِرک های آلبوم : ${item.album.total_tracks}
  `,
          });
        }
      });
    } catch (e) {}
  } catch (e) {}
});

bot.start();
