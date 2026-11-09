"use client";
import Navbar from "./navbar";
interface Props { user:{id:string;name:string;role:string;profilePicture:string}; setCurrentPage:(page:string)=>void; currentPage?:string }
/** Compatibility wrapper: both viewport sizes share the same navigation. */
export default function MobileNavbar({user,setCurrentPage,currentPage="/"}:Props) {
 return <Navbar user={{...user,slack_userid:""}} currentPage={currentPage} setCurrentPage={setCurrentPage}/>;
}
