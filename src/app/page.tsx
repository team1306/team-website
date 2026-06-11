import Navbar from "./navbar";
import Purchase from "./purchaseCard";

export default function Home() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar></Navbar>
      <Purchase itemName="Item Name" cost={100} requestor="User" catagory="Operations"></Purchase>
    </div>
  );
}
