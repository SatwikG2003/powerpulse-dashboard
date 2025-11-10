import mongoose from "mongoose";

const PowerDataSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    voltage: {
        R: { type: Number, default: 0 },
        Y: { type: Number, default: 0 },
        B: { type: Number, default: 0 }
    },
    current: {
        R: { type: Number, default: 0 },
        Y: { type: Number, default: 0 },
        B: { type: Number, default: 0 }
    },
    powerFactor: { type: Number, default: 1.0 },
    thd: { type: Number, default: 0.0 },
    activePower: { type: Number, default: 0.0 }
});

const PowerData = mongoose.model("PowerData", PowerDataSchema);
export default PowerData;
