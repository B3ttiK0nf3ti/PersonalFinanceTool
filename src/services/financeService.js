import axios from "axios";

const API_URL = "http://127.0.0.1:5000";

export const getTransactions = async () => {
  return await axios.get(`${API_URL}/transactions`);
};

export const addTransaction = async (transaction) => {
  return await axios.post(`${API_URL}/transactions`, transaction);
};
