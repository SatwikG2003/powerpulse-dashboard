import mongoose from "mongoose";
const phaseSchema = new mongoose.Schema({ R: Number, Y: Number, B: Number }, { _id: false });
const dataSchema = new mongoose.Schema({
  voltage: phaseSchema,
  current: phaseSchema,
  powerFactor: Number,
  thd: Number,
  activePower: Number,
  timestamp: { type: Date, default: Date.now },
});
export default mongoose.model("GeneratorData", dataSchema);
