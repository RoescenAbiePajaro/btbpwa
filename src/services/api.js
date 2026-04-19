import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const saveWorkToGallery = async (thumbnail, canvasData) => {
  const res = await api.post('/gallery', { thumbnail, canvasData });
  return res.data;
};

export const loadWorkFromGallery = async (workId) => {
  const res = await api.get(`/gallery/${workId}`);
  // Return the entire saved work data (which now contains canvasData with text objects)
  return res.data.canvasData;
};

export const getUserGallery = async () => {
  const res = await api.get('/gallery');
  return res.data;
};

export const deleteWorkFromGallery = async (workId) => {
  const res = await api.delete(`/gallery/${workId}`);
  return res.data;
};

export const deleteMultipleWorksFromGallery = async (workIds) => {
  const res = await api.delete('/gallery', { data: { ids: workIds } });
  return res.data;
};