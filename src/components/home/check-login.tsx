import { useEffect } from "react";
import Login from "../login/login";
import IncomeExpense from "../income-expense";

export default function CheckLogin() {
  function checkToken() {
    const token = localStorage.getItem("token");
    return token;
  }
  useEffect(() => {
    checkToken();
    console.log("Component initialized");
  }, []); // [] คือการบอกให้ทำงานแค่ครั้งเดียวตอน Mount
  return <>{checkToken() ? <IncomeExpense></IncomeExpense> : <Login></Login>}</>;
}
