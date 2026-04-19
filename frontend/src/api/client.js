import axios from 'axios'
import { getToken } from '../stores/authStore'

const client = axios.create({
  baseURL: 'http://localhost:8080/api',
})

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
