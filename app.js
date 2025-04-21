import express from "express";
import configViewEngine from "./config/viewEngine.js";
import initWebRoutes from "./route/web.js";

const app = express();
const port = 8000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

configViewEngine(app);
initWebRoutes(app);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
