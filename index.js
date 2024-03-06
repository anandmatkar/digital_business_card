const cluster = require("cluster");
const connection = require("./src/config/database");
const router = require("./src/routes/indexRoutes");
require("dotenv").config();
const numCPUs = require("os").cpus().length;
const bodyParser = require("body-parser"); // Import body-parser

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

    // Apply body-parser middleware with desired request body size limit
    app.use(bodyParser.json({ limit: '10mb' })); // Adjust the limit as per your requirements
    app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' })); // Adjust the limit as per your requirements

    app.use(express.static('uploads'));
    app.use(express.static('public'));

    const server = app.listen(process.env.APP_PORT, () =>
        console.log(`Worker ${process.pid} started on ${process.env.APP_PORT}`)
    );

    app.use('/api/v1', router);

    app.use("/api/demo", (req, res) => {
        res.status(200).send({
            message: "Working",
        });
    });
}
