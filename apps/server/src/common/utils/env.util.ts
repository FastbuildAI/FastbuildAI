import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({
    path: path.resolve(
        path.resolve(__dirname, `../../../../../.env.${process.env.NODE_ENV}.local`),
    ),
});
