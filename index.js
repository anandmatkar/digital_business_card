const cluster = require("cluster");
const connection = require("./src/config/database");
const router = require("./src/routes/indexRoutes");
require("dotenv").config();
const numCPUs = require("os").cpus().length;
if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });
} else {
    const express = require("express");
    const cors = require("cors");
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('uploads'));
    app.use(express.static('public'));


    const server = app.listen(process.env.APP_PORT, () =>
        console.log(`Worker ${process.pid} started on ${process.env.APP_PORT}`)
    );

    app.use('/api/v1', router)

    app.use("/api/demo", (req, res) => {
        res.status(200).send({
            message: "Working",
        });
    });
}
