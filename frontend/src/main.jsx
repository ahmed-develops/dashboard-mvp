import * as React from "react";
import * as ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import "./index.css";
import App from "./App";
import GraphTesting from "./routes/GraphTesting";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App/>
  },
  {
    path: "/GraphTesting",
    element: <GraphTesting/>
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);