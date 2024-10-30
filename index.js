import { $connect, $disconnect } from "./src/lib/db.js"
import { Schema, model } from "mongoose"

import { DateTime } from "luxon"
import { URL_TO_SCRAP } from "./src/const/api.js"
import { chromium } from "playwright"

const CotizacionSchema = new Schema(
  {
    venta: Number,
    compra: Number,
    fecha: String,
    variacion: String,
  },
  { _id: true, timestamps: true }
)

const Cotizacion = model("Cotizacion", CotizacionSchema, "cotizaciones")

const INITIAL_DATE = DateTime.local(2011, 1, 3).setLocale("es-AR")

const syncDatabase = async () => {
  console.time("syncDatabase")
  let date = INITIAL_DATE

  // Connect to database
  await $connect()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  const lastCotizacion = await Cotizacion.findOne().sort({ _id: -1 })
  console.log("Ultima cotizacion: ", lastCotizacion)

  if (lastCotizacion) {
    const [day, month, year] = lastCotizacion.fecha.split("-")
    date = DateTime.fromJSDate(new Date(year, month - 1, day))
      .set({ day: 1 })
      .setLocale("es-AR")
  }

  while (date.toMillis() < DateTime.now().toMillis()) {
    await page.goto(`${URL_TO_SCRAP}/mes/${date.monthLong}-${date.year}`)

    const data = await page.$$eval("#dataTable tbody tr", (rows) => {
      return rows.map((row) => {
        const cells = row.querySelectorAll("td")
        const [day, month, year] = cells[0].textContent
          ?.trim()
          .split("/")
          .map((item) => Number(item))

        return {
          fecha: `${day}-${month}-${year}`,
          compra: parseFloat(
            cells[1]?.textContent.trim().replace(".", "").replace(",", ".")
          ),
          venta: parseFloat(
            cells[2]?.textContent.trim().replace(".", "").replace(",", ".")
          ),
          variacion: cells[3]?.textContent?.trim(),
        }
      })
    })

    for (const item of data) {
      const exists = await Cotizacion.findOne({ fecha: item.fecha })
      if (!exists) await new Cotizacion(item).save()
    }

    console.log(`${date.monthLong}-${date.year} ✅`)

    date = date.plus({ months: 1 }).set({ day: 1 }) // Incrementa un mes y setea al primer dia del mes.
  }

  await $disconnect()
  console.log("Base de datos sincronizada ✅")

  await browser.close()
  console.timeEnd("syncDatabase")
}

await syncDatabase()
