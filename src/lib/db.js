import { DATABASE_URL } from "../const/api.js"
import mongoose from "mongoose"

const { connect, connection, disconnect } = mongoose

let IS_CONNECTED = false

export const $connect = async () => {
  if (IS_CONNECTED) return

  const db = await connect(DATABASE_URL, { dbName: "dolar-api" })
  IS_CONNECTED = true
}

export const $disconnect = async () => {
  if (!IS_CONNECTED) return

  await disconnect()
  IS_CONNECTED = false
}

connection.on("connected", () => console.log("Connected to MongoDB ✅"))
connection.on("error", () => console.log("Error to connect to MongoDB ❌"))
