import { Store } from '../types'

export const mockStores: Store[] = [
  {
    id: '1',
    name: '台南林百貨',
    address: '台南市中西區中正路63號',
    coordinates: { lat: 22.9969, lng: 120.2021 },
    images: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1555529902-1c8b2b3b3b3b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop'
    ],
    googleMapLink: 'https://maps.google.com/?q=22.9969,120.2021',
    instagramLink: 'https://instagram.com/lin_department_store',
    tags: ['復古', '台灣', '文創'],
    businessHours: {
      monday: '11:00–19:00',
      tuesday: '11:00–19:00',
      wednesday: '11:00–19:00',
      thursday: '11:00–19:00',
      friday: '11:00–19:00',
      saturday: '10:00–20:00',
      sunday: '10:00–20:00'
    },
    rating: 4.5,
    visitCount: 128,
    isFavorite: false
  },
  {
    id: '2',
    name: '台北松菸誠品',
    address: '台北市信義區菸廠路88號',
    coordinates: { lat: 25.0438, lng: 121.5606 },
    images: [
      'https://images.unsplash.com/photo-1555529902-1c8b2b3b3b3b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
    ],
    googleMapLink: 'https://maps.google.com/?q=25.0438,121.5606',
    instagramLink: 'https://instagram.com/eslite_songyan',
    tags: ['文創', '書店', '咖啡'],
    businessHours: {
      monday: '10:00–22:00',
      tuesday: '10:00–22:00',
      wednesday: '10:00–22:00',
      thursday: '10:00–22:00',
      friday: '10:00–22:00',
      saturday: '10:00–22:00',
      sunday: '10:00–22:00'
    },
    rating: 4.3,
    visitCount: 256,
    isFavorite: true
  },
  {
    id: '3',
    name: '高雄駁二藝術特區',
    address: '高雄市鹽埕區大勇路1號',
    coordinates: { lat: 22.6206, lng: 120.2819 },
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
    ],
    businessHours: {
      monday: '10:00–18:00',
      tuesday: '10:00–18:00',
      wednesday: '10:00–18:00',
      thursday: '10:00–18:00',
      friday: '10:00–18:00',
      saturday: '10:00–20:00',
      sunday: '10:00–20:00'
    },
    googleMapLink: 'https://maps.google.com/?q=22.6206,120.2819',
    instagramLink: 'https://instagram.com/pier2art',
    tags: ['藝術', '文創', '展覽'],
    rating: 4.7,
    visitCount: 189,
    isFavorite: false
  },
  {
    id: '4',
    name: '台中審計新村',
    address: '台中市西區民生路368巷',
    coordinates: { lat: 24.1408, lng: 120.6647 },
    images: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
    ],
    googleMapLink: 'https://maps.google.com/?q=24.1408,120.6647',
    instagramLink: 'https://instagram.com/audit_village',
    tags: ['文創', '咖啡', '手作'],
    rating: 4.4,
    visitCount: 167,
    isFavorite: true
  },
  {
    id: '5',
    name: '花蓮文創園區',
    address: '花蓮縣花蓮市中華路144號',
    coordinates: { lat: 23.9739, lng: 121.6014 },
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
    ],
    googleMapLink: 'https://maps.google.com/?q=23.9739,121.6014',
    instagramLink: 'https://instagram.com/hualien_creative',
    tags: ['文創', '原住民', '工藝'],
    rating: 4.2,
    visitCount: 98,
    isFavorite: false
  },
  {
    id: '6',
    name: '新竹城隍廟商圈',
    address: '新竹市北區中山路75號',
    coordinates: { lat: 24.8047, lng: 120.9686 },
    images: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop'
    ],
    googleMapLink: 'https://maps.google.com/?q=24.8047,120.9686',
    instagramLink: 'https://instagram.com/hsinchu_temple',
    tags: ['傳統', '小吃', '工藝'],
    rating: 4.1,
    visitCount: 145,
    isFavorite: false
  }
]
