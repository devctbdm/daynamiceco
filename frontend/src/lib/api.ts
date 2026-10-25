import { apiFetch } from './http';

export type AuditLog = {
  _id: string;
  actor?: { id?: string; name?: string; role?: string };
  action: string;
  target?: string;
  changes?: { request?: Record<string, unknown>; statusCode?: number } | null;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

export const auditApi = {
  getAll: (params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
  }) =>
    apiFetch<{
      success: boolean;
      logs: AuditLog[];
      total: number;
      pages: number;
    }>('/audit', { params }),
};

// Generic single-image upload (used by rich-text editors to insert images)
export const uploadApi = {
  image: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return apiFetch<{ success: boolean; url: string; publicId?: string }>(
      '/upload/image',
      { method: 'POST', body: fd }
    );
  },
  logo: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return apiFetch<{ success: boolean; url: string; publicId?: string }>(
      '/upload/logo',
      { method: 'POST', body: fd }
    );
  },
};

export type Category = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  active: boolean;
  productCount?: number;
  imageUrl: string;
  bannerUrl: string;
  featured: boolean;
  sortOrder: number;
  color: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryForm = {
  name: string;
  slug?: string;
  description: string;
  parentId: string | null;
  active: boolean;
  imageUrl: string;
  bannerUrl: string;
  featured: boolean;
  sortOrder: number;
  color: string;
};

function toFormData(
  data: Record<string, any>,
  files?: { image?: File | null; banner?: File | null }
): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(data)) {
    if (val !== null && val !== undefined) {
      fd.append(key, String(val));
    }
  }
  if (files?.image) fd.append('image', files.image);
  if (files?.banner) fd.append('banner', files.banner);
  return fd;
}

export const categoryApi = {
  getAll: () =>
    apiFetch<{ success: boolean; categories: Category[] }>('/categories'),

  getById: (id: string) =>
    apiFetch<{ success: boolean; category: Category }>(`/categories/${id}`),

  create: (
    data: CategoryForm,
    files?: { image?: File | null; banner?: File | null }
  ) =>
    apiFetch<{ success: boolean; category: Category }>('/categories', {
      method: 'POST',
      body: toFormData(data as any, files),
    }),

  update: (
    id: string,
    data: Partial<CategoryForm>,
    files?: { image?: File | null; banner?: File | null }
  ) =>
    apiFetch<{ success: boolean; category: Category }>(`/categories/${id}`, {
      method: 'PUT',
      body: toFormData(data as any, files),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    }),

  reorder: (orders: { id: string; sortOrder: number }[]) =>
    apiFetch<{ success: boolean; message: string }>('/categories/reorder', {
      method: 'PUT',
      body: {
        orders,
      },
    }),
};

export type ProductFilterSettings = {
  categoryId: string;
  brand: string;
  price: boolean;
  rating: boolean;
  availability: boolean;
  facets: string[];
  updatedAt?: string;
};

export const productFilterApi = {
  getAll: () =>
    apiFetch<{ success: boolean; settings: ProductFilterSettings[] }>(
      '/product-filters'
    ),

  save: (settings: Omit<ProductFilterSettings, 'updatedAt'>) =>
    apiFetch<{ success: boolean; settings: ProductFilterSettings }>(
      '/product-filters',
      { method: 'PUT', body: settings }
    ),

  reset: (categoryId: string, brand = '') =>
    apiFetch<{ success: boolean; message: string }>(
      `/product-filters/${encodeURIComponent(categoryId)}`,
      { method: 'DELETE', params: { brand: brand || undefined } }
    ),
};

export type SliderType = 'hero' | 'ad_top' | 'ad_bottom';

export type Slider = {
  _id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  type: SliderType;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type HomeSliderText = {
  _id: string;
  text: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type HomeSliderTextForm = {
  text: string;
  active: boolean;
  sortOrder: number;
};

export type SliderForm = {
  image: string;
  link: string;
  type: SliderType;
  active: boolean;
  sortOrder: number;
};

export type SliderSetting = {
  enabled: boolean;
  autoSlide: boolean;
  interval: number;
  updatedAt?: string;
};

export const sliderApi = {
  getAll: (params?: { active?: boolean }) =>
    apiFetch<{
      success: boolean;
      sliders: Slider[];
      setting: SliderSetting;
    }>('/sliders', {
      params: params
        ? { active: params.active ? 'true' : undefined }
        : undefined,
    }),

  create: (data: SliderForm, image?: File | null) =>
    apiFetch<{ success: boolean; slider: Slider }>('/sliders', {
      method: 'POST',
      body: toFormData(data as any, { image }),
    }),

  update: (id: string, data: Partial<SliderForm>, image?: File | null) =>
    apiFetch<{ success: boolean; slider: Slider }>(`/sliders/${id}`, {
      method: 'PUT',
      body: toFormData(data as any, { image }),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/sliders/${id}`, {
      method: 'DELETE',
    }),

  reorder: (orders: { id: string; sortOrder: number }[]) =>
    apiFetch<{ success: boolean; message: string }>('/sliders/reorder', {
      method: 'PUT',
      body: {
        orders,
      },
    }),

  updateSetting: (setting: Partial<SliderSetting>) =>
    apiFetch<{ success: boolean; setting: SliderSetting }>('/sliders/setting', {
      method: 'PUT',
      body: setting,
    }),
};

export const homeSliderTextApi = {
  getAll: (params?: { active?: boolean }) =>
    apiFetch<{ success: boolean; texts: HomeSliderText[] }>(
      '/home-slider-texts',
      {
        params: params
          ? { active: params.active ? 'true' : undefined }
          : undefined,
      }
    ),

  create: (data: HomeSliderTextForm) =>
    apiFetch<{ success: boolean; text: HomeSliderText }>('/home-slider-texts', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: Partial<HomeSliderTextForm>) =>
    apiFetch<{ success: boolean; text: HomeSliderText }>(
      `/home-slider-texts/${id}`,
      { method: 'PUT', body: data }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/home-slider-texts/${id}`,
      { method: 'DELETE' }
    ),

  reorder: (orders: { id: string; sortOrder: number }[]) =>
    apiFetch<{ success: boolean; message: string }>(
      '/home-slider-texts/reorder',
      {
        method: 'PUT',
        body: {
          orders,
        },
      }
    ),
};

export type HomeSliderSetting = {
  enabled: boolean;
};

export const homeSliderSettingApi = {
  get: () =>
    apiFetch<{ success: boolean; setting: HomeSliderSetting }>(
      '/home-slider-texts/setting'
    ),

  update: (data: { enabled: boolean }) =>
    apiFetch<{ success: boolean; setting: HomeSliderSetting }>(
      '/home-slider-texts/setting',
      { method: 'PUT', body: data }
    ),
};

export type PhysicalStorePhone = {
  label: string;
  number: string;
};

export type PhysicalStore = {
  _id: string;
  title: string;
  address: string;
  description: string;
  phones: PhysicalStorePhone[];
  openTime: string;
  closeTime: string;
  offDay: string;
  mapUrl: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PhysicalStoreForm = {
  title: string;
  address: string;
  description: string;
  phones: PhysicalStorePhone[];
  openTime: string;
  closeTime: string;
  offDay: string;
  mapUrl: string;
  active: boolean;
  sortOrder: number;
};

export type PhysicalStoreSetting = {
  enabled: boolean;
  title: string;
  subtitle: string;
  description: string;
  buttonLabel: string;
  buttonLink: string;
  bannerUrl: string;
  showCount: boolean;
  countSuffix: string;
  count: number;
};

export const physicalStoreApi = {
  getAll: (params?: { active?: boolean }) =>
    apiFetch<{ success: boolean; stores: PhysicalStore[] }>(
      '/physical-stores',
      {
        params: params
          ? { active: params.active ? 'true' : undefined }
          : undefined,
      }
    ),

  create: (data: PhysicalStoreForm) =>
    apiFetch<{ success: boolean; store: PhysicalStore }>('/physical-stores', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: Partial<PhysicalStoreForm>) =>
    apiFetch<{ success: boolean; store: PhysicalStore }>(
      `/physical-stores/${id}`,
      { method: 'PUT', body: data }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/physical-stores/${id}`, {
      method: 'DELETE',
    }),

  reorder: (orders: { id: string; sortOrder: number }[]) =>
    apiFetch<{ success: boolean; message: string }>(
      '/physical-stores/reorder',
      { method: 'PUT', body: { orders } }
    ),
};

export const physicalStoreSettingApi = {
  get: () =>
    apiFetch<{ success: boolean; setting: PhysicalStoreSetting }>(
      '/physical-stores/setting'
    ),

  update: (data: Partial<PhysicalStoreSetting>, banner?: File | null) => {
    const fd = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) fd.append(key, String(value));
    }
    if (banner) fd.append('image', banner);
    return apiFetch<{ success: boolean; setting: PhysicalStoreSetting }>(
      '/physical-stores/setting',
      { method: 'PUT', body: fd }
    );
  },
};

export type HomeContent = {
  _id: string | null;
  content: string;
  enabled: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export const homeContentApi = {
  get: () =>
    apiFetch<{ success: boolean; homeContent: HomeContent }>('/home-content'),

  update: (data: { content: string; enabled: boolean }) =>
    apiFetch<{ success: boolean; homeContent: HomeContent }>('/home-content', {
      method: 'PUT',
      body: data,
    }),

  delete: () =>
    apiFetch<{ success: boolean; message: string }>('/home-content', {
      method: 'DELETE',
    }),
};

export type PopupOffer = {
  _id: string | null;
  image: string;
  enabled: boolean;
  delaySeconds: number;
  maxShowsPerDay: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export const popupOfferApi = {
  get: () =>
    apiFetch<{ success: boolean; popupOffer: PopupOffer }>('/popup-offer'),

  update: (data: FormData) =>
    apiFetch<{ success: boolean; popupOffer: PopupOffer }>('/popup-offer', {
      method: 'PUT',
      body: data,
    }),
};

export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedResponse<T> = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  users: T[];
};

export const userApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) => apiFetch<PaginatedResponse<AdminUser>>('/users', { params }),

  getById: (id: string) =>
    apiFetch<{ success: boolean; user: AdminUser }>(`/users/${id}`),

  create: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
    status?: string;
  }) =>
    apiFetch<{ success: boolean; user: AdminUser }>('/users', {
      method: 'POST',
      body: data,
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      role: string;
      status: string;
      password: string;
    }>
  ) =>
    apiFetch<{ success: boolean; user: AdminUser }>(`/users/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),
};

export type Customer = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  status: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
};

export type CustomerPaginatedResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  customers: Customer[];
};

export const customerApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => apiFetch<CustomerPaginatedResponse>('/customers', { params }),

  getById: (id: string) =>
    apiFetch<{ success: boolean; customer: Customer }>(`/customers/${id}`),

  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    }),
};

export type TeamMember = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'super_admin';
  active: boolean;
  password?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
};

export type TeamMemberPayload = {
  name?: string;
  email?: string;
  role?: string;
  active?: boolean;
  password?: string;
};

export const teamApi = {
  getAll: () => apiFetch<{ success: boolean; members: TeamMember[] }>('/team'),

  create: (data: {
    name: string;
    email: string;
    role: string;
    password?: string;
    active?: boolean;
  }) =>
    apiFetch<{ success: boolean; member: TeamMember }>('/team', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: TeamMemberPayload) =>
    apiFetch<{ success: boolean; member: TeamMember }>(`/team/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/team/${id}`, {
      method: 'DELETE',
    }),
};

export type Session = {
  _id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
};

export type StoreSettings = {
  _id: string;
  storeName: string;
  storeUrl: string;
  email: string;
  phone: string;
  description: string;
  logoType: 'text' | 'image';
  logoText: string;
  logoSubText: string;
  logoIconUrl: string;
  logoUrl: string;
  currency: string;
  timezone: string;
  address: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const storeApi = {
  get: () => apiFetch<{ success: boolean; settings: StoreSettings }>('/store'),
  getPublic: () =>
    apiFetch<{ success: boolean; settings: StoreSettings }>('/store/public'),
  update: (data: Partial<StoreSettings>) =>
    apiFetch<{ success: boolean; settings: StoreSettings }>('/store', {
      method: 'PUT',
      body: data,
    }),
};

export type PaymentGateway = {
  _id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
};

export const paymentSettingsApi = {
  getAll: () =>
    apiFetch<{ success: boolean; gateways: PaymentGateway[] }>(
      '/payment-settings'
    ),
  getActive: () =>
    apiFetch<{ success: boolean; gateways: ActivePaymentGateway[] }>(
      '/payment-settings/active'
    ),
  update: (
    id: string,
    data: { enabled?: boolean; config?: Record<string, any> }
  ) =>
    apiFetch<{ success: boolean; gateway: PaymentGateway }>(
      `/payment-settings/${id}`,
      { method: 'PUT', body: data }
    ),
};

export type ActivePaymentGateway = {
  name: string;
  label: string;
  description: string;
};

export const paymentApi = {
  initiate: (data: {
    orderId: string;
    amount: number;
    customer: {
      name: string;
      email: string;
      phone: string;
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      postcode?: string;
    };
    advance?: boolean;
  }) =>
    apiFetch<{
      success: boolean;
      gatewayUrl: string;
      tran_id: string;
      advance?: boolean;
      message?: string;
    }>('/payment/initiate', { method: 'POST', body: data }),
  validate: (data: {
    tran_id: string;
    val_id?: string;
    status?: string;
    amount?: number;
    card_type?: string;
  }) =>
    apiFetch<{
      success: boolean;
      valid: boolean;
      advance?: boolean;
      order?: string;
    }>('/payment/validate', { method: 'POST', body: data }),
  queryTransaction: (tran_id: string) =>
    apiFetch<{
      success: boolean;
      gatewayStatus?: string;
      paymentStatus?: string;
      advancePaid?: number;
      updated?: boolean;
      order?: string;
    }>(`/payment/transaction/${tran_id}`),
  cancel: (data: { tran_id: string }) =>
    apiFetch<{ success: boolean; message: string }>('/payment/cancel', {
      method: 'POST',
      body: data,
    }),
};

export type ActiveTeamMember = {
  _id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export type AuthMe = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
};

export type SavedAddress = {
  _id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  deliveryArea?: string;
  isDefault: boolean;
};

export const authApi = {
  getMe: () => apiFetch<{ success: boolean; user: AuthMe }>('/auth/me'),

  updateProfile: (data: {
    name?: string;
    phone?: string;
    address?: Partial<AuthMe['address']>;
  }) =>
    apiFetch<{ success: boolean; user: AuthMe }>('/auth/me', {
      method: 'PUT',
      body: data,
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiFetch<{ success: boolean; message: string }>('/auth/me/password', {
      method: 'PUT',
      body: data,
    }),

  getSessions: () =>
    apiFetch<{ success: boolean; sessions: Session[] }>('/auth/me/sessions'),

  revokeSession: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/auth/me/sessions/${id}`, {
      method: 'DELETE',
    }),

  getAddresses: () =>
    apiFetch<{ success: boolean; addresses: SavedAddress[] }>(
      '/auth/me/addresses'
    ),

  addAddress: (data: Partial<SavedAddress>) =>
    apiFetch<{ success: boolean; addresses: SavedAddress[] }>(
      '/auth/me/addresses',
      { method: 'POST', body: data }
    ),

  updateAddress: (id: string, data: Partial<SavedAddress>) =>
    apiFetch<{ success: boolean; addresses: SavedAddress[] }>(
      `/auth/me/addresses/${id}`,
      { method: 'PUT', body: data }
    ),

  deleteAddress: (id: string) =>
    apiFetch<{ success: boolean; addresses: SavedAddress[] }>(
      `/auth/me/addresses/${id}`,
      { method: 'DELETE' }
    ),

  setDefaultAddress: (id: string) =>
    apiFetch<{ success: boolean; addresses: SavedAddress[] }>(
      `/auth/me/addresses/${id}/default`,
      { method: 'PUT' }
    ),

  verifyOtp: (data: { pendingToken: string; otp: string }) =>
    apiFetch<{
      success: boolean;
      token?: string;
      user?: AuthMe;
      message?: string;
    }>('/auth/verify-otp', { method: 'POST', body: data }),
};

export type LoginResponse = {
  success: boolean;
  token?: string;
  user?: AuthMe;
  twoFactorRequired?: boolean;
  pendingToken?: string;
  expiresIn?: number;
  message?: string;
};

export type OrderStatus =
  'pending' | 'processing' | 'confirmed' | 'send_courier' | 'cancelled';

export type OrderItem = {
  product: string | { _id: string; name: string };
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantId?: string;
  variantLabel?: string;
  sku?: string;
  variant?: {
    color?: string;
    storage?: string;
    ram?: string;
  };
};

export type Order = {
  _id: string;
  orderNumber?: string;
  user: string | { _id: string; name: string; email: string; phone?: string };
  items: OrderItem[];
  shippingAddress: {
    fullName?: string;
    phone?: string;
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  totalAmount: number;
  coupon?: {
    code: string;
    discount: number;
  };
  payment: {
    method: string;
    status: string;
    tran_id?: string;
    amount?: number;
    val_id?: string;
    card_type?: string;
    paidAt?: string;
  };
  orderStatus: OrderStatus;
  note?: string;
  advanceAmount?: number;
  advancePaid?: number;
  advanceReference?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderStats = {
  total: number;
  pending: number;
  processing: number;
  confirmed: number;
  send_courier: number;
  cancelled: number;
};

export const orderApi = {
  getMyOrders: () =>
    apiFetch<{ success: boolean; orders: Order[] }>('/orders/my-orders'),

  getById: (id: string) =>
    apiFetch<{ success: boolean; order: Order }>(`/orders/${id}`),
  getAllOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) =>
    apiFetch<{
      success: boolean;
      total: number;
      page: number;
      pages: number;
      orders: Order[];
    }>('/orders', { params }),

  getStats: () =>
    apiFetch<{ success: boolean; stats: OrderStats }>('/orders/stats'),

  updateStatus: (id: string, status: OrderStatus) =>
    apiFetch<{ success: boolean; order: Order }>(`/orders/${id}/status`, {
      method: 'PUT',
      body: {
        status,
      },
    }),

  updatePaymentStatus: (
    id: string,
    status: 'pending' | 'paid' | 'failed' | 'cancelled'
  ) =>
    apiFetch<{ success: boolean; order: Order }>(
      `/orders/${id}/payment-status`,
      { method: 'PUT', body: { status } }
    ),

  updateAdvance: (
    id: string,
    data: {
      advanceAmount?: number;
      advancePaid?: number;
      advanceReference?: string;
    }
  ) =>
    apiFetch<{ success: boolean; order: Order }>(`/orders/${id}/advance`, {
      method: 'PUT',
      body: data,
    }),

  create: (data: {
    items: { product: string; variantId?: string; quantity: number }[];
    shippingAddress: Order['shippingAddress'];
    paymentMethod: string;
    note?: string;
    couponCode?: string;
  }) =>
    apiFetch<{ success: boolean; order: Order }>('/orders', {
      method: 'POST',
      body: data,
    }),

  adminCreate: (data: {
    customerId: string;
    items: { product: string; variantId?: string; quantity: number }[];
    shippingAddress: Order['shippingAddress'];
    paymentMethod: string;
    paymentStatus?: 'pending' | 'paid' | 'failed' | 'cancelled';
    orderStatus?: OrderStatus;
    note?: string;
    couponCode?: string;
    shippingFee?: number;
  }) =>
    apiFetch<{
      success: boolean;
      order: Order;
      summary: {
        subtotal: number;
        shippingFee: number;
        couponDiscount: number;
        totalAmount: number;
      };
    }>('/orders/admin-create', { method: 'POST', body: data }),
};

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

export type InvoiceItem = {
  _id: string;
  product: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  warranty: string;
  serialNumbers: string[];
};

export type Invoice = {
  _id: string;
  order: string;
  invoiceNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  extraCharge: number;
  netPayable: number;
  status: InvoiceStatus;
  note: string;
  salesPerson: string;
  preparedBy?: { _id: string; name: string } | string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceStats = {
  totalOutstanding: number;
  totalPaid: number;
  totalOverdue: number;
  cancelledCount: number;
};

export const invoiceApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) =>
    apiFetch<{
      success: boolean;
      total: number;
      page: number;
      pages: number;
      invoices: Invoice[];
    }>('/invoices', { params }),

  getStats: () =>
    apiFetch<{ success: boolean; stats: InvoiceStats }>('/invoices/stats'),

  get: (id: string) =>
    apiFetch<{ success: boolean; invoice: Invoice }>(`/invoices/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch<{ success: boolean; invoice: Invoice }>(`/invoices/${id}`, {
      method: 'PUT',
      body: data,
    }),

  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/invoices/${id}`, {
      method: 'DELETE',
    }),

  generateFromOrder: (orderId: string) =>
    apiFetch<{ success: boolean; invoice: Invoice }>(
      `/invoices/order/${orderId}`,
      { method: 'POST' }
    ),

  syncFromOrders: () =>
    apiFetch<{ success: boolean; created: number }>('/invoices/sync', {
      method: 'POST',
    }),
};

export type DashboardStats = {
  revenue: number;
  orders: number;
  customers: number;
  productsSold: number;
  products: number;
  ordersByStatus: {
    processing: number;
    pending: number;
    confirmed: number;
    send_courier: number;
    cancelled: number;
  };
  recentOrders: Order[];
  topProducts: {
    _id: string;
    name: string;
    image: string;
    sales: number;
    revenue: number;
  }[];
  salesByCategory: { name: string; value: number }[];
  monthlyRevenue: { label: string; value: number }[];
  /** Count of orders awaiting processing. */
  pendingOrders: number;
  /** Active products at or below the low-stock threshold. */
  lowStock: {
    _id: string;
    name: string;
    slug: string;
    stock: number;
    sku: string;
    image: string;
  }[];
  /** Latest mutating admin actions (logins, creates, updates, deletes). */
  recentActivity: {
    _id: string;
    action: string;
    eventType: string;
    actorName: string;
    actorRole: string | null;
    target: string;
    statusCode: number | null;
    createdAt: string | null;
  }[];
};

export const dashboardApi = {
  getStats: () =>
    apiFetch<{ success: boolean; stats: DashboardStats }>('/dashboard'),
};

export type AnalyticsPoint = {
  month: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
};

export type AnalyticsStats = {
  stats: {
    revenue: number;
    orders: number;
    customers: number;
    products: number;
    productsSold: number;
    avgOrderValue: number;
    avgItemsPerOrder: number;
    repeatCustomerRate: number;
    ordersByStatus: {
      processing: number;
      pending: number;
      confirmed: number;
      send_courier: number;
      cancelled: number;
    };
  };
  monthly: AnalyticsPoint[];
  daily: AnalyticsPoint[];
  topProducts: {
    _id: string;
    name: string;
    image: string;
    price: number;
    sku?: string;
    productCode?: string;
    unitsSold: number;
    revenue: number;
  }[];
  categories: {
    name: string;
    revenue: number;
    orders: number;
    percentage: number;
  }[];
};

export const analyticsApi = {
  getStats: () =>
    apiFetch<{ success: boolean; data: AnalyticsStats }>('/analytics'),
};

export type VisitorOverview = {
  days: number;
  summary: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    pageViews: number;
    engagementRate: number;
  };
  daily: { date: string; activeUsers: number; sessions: number }[];
  devices: { device: string; activeUsers: number; sessions: number }[];
  topPages: {
    title: string;
    path: string;
    pageViews: number;
    activeUsers: number;
  }[];
};

export const visitorApi = {
  getOverview: (days: 7 | 30 | 90 = 30) =>
    apiFetch<{ success: boolean; data: VisitorOverview }>(
      '/visitors/overview',
      {
        params: { days },
      }
    ),
};

export type ProductFormData = {
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  stock: number;
  status: string;
  featured: boolean;
  holiday: boolean;
  specifications?: Record<string, any>;
  images?: string[];
};

export const productApi = {
  create: (data: FormData) =>
    apiFetch<{ success: boolean; product: any }>('/products', {
      method: 'POST',
      body: data,
    }),

  getAll: (params?: Record<string, any>) =>
    apiFetch<{ success: boolean; products: any[] }>('/products', { params }),

  getById: (id: string) =>
    apiFetch<{ success: boolean; product: any }>(`/products/${id}`),

  getBySlug: (slug: string) =>
    apiFetch<{ success: boolean; product: any }>(`/products/slug/${slug}`),

  addRating: (id: string, data: { rating: number; comment?: string }) =>
    apiFetch<{ success: boolean; product: any }>(`/products/${id}/ratings`, {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: FormData) =>
    apiFetch<{ success: boolean; product: any }>(`/products/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/products/${id}`, {
      method: 'DELETE',
    }),

  getPcParts: (params?: Record<string, string>) =>
    apiFetch<PcPartsResponse>('/products/pc-parts', { params }),

  generateSku: (data: { name?: string; category?: string }) =>
    apiFetch<{ success: boolean; sku: string; suffix: string }>(
      '/products/generate-sku',
      { method: 'POST', body: data }
    ),

  generateProductCode: () =>
    apiFetch<{ success: boolean; productCode: string }>(
      '/products/generate-code',
      { method: 'POST' }
    ),
};

export type PcPartType =
  | 'cpu'
  | 'cpu_cooler'
  | 'motherboard'
  | 'ram'
  | 'storage'
  | 'gpu'
  | 'psu'
  | 'casing'
  | 'monitor'
  | 'casing_cooler'
  | 'keyboard'
  | 'mouse'
  | 'speaker'
  | 'headphone'
  | 'wifi_adapter'
  | 'antivirus'
  | 'ups';

export type PcPartInfo = {
  enabled: boolean;
  type: PcPartType | '';
  socket?: string;
  platform?: string;
  formFactor?: string;
  wattage?: number;
};

export type PcPart = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  images?: string[];
  image?: string;
  brand?: string;
  stock?: number;
  pcPart: PcPartInfo;
};

export type PcPartsResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  products: PcPart[];
};

export const pcPartsApi = {
  list: (params?: Record<string, string>) =>
    apiFetch<PcPartsResponse>('/products/pc-parts', { params }),
};

export type SavedComponent = {
  product: string; // product _id
  name: string;
  image: string;
  price: number;
  wattage: number;
};

export type SavedBuild = {
  _id: string;
  name: string;
  components: Record<string, SavedComponent>;
  createdAt?: string;
  updatedAt?: string;
};

export const pcBuilderApi = {
  getMyBuilds: () =>
    apiFetch<{ success: boolean; builds: SavedBuild[] }>('/pc-builder/builds'),
  save: (data: {
    name?: string;
    components: Record<string, { product: string }>;
  }) =>
    apiFetch<{ success: boolean; build: SavedBuild }>('/pc-builder/builds', {
      method: 'POST',
      body: data,
    }),
  remove: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/pc-builder/builds/${id}`,
      { method: 'DELETE' }
    ),
};

export type Review = {
  _id: string;
  rating: number;
  comment: string;
  status: 'approved' | 'pending' | 'rejected';
  featured: boolean;
  createdAt: string;
  user: { _id: string; name: string } | null;
  product: { _id: string; name: string; slug: string; image: string } | null;
};

export type ReviewStats = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  featured: number;
  averageRating: number;
  distribution: { rating: number; count: number }[];
};

export type ReviewPaginatedResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  reviews: Review[];
};

export const reviewApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    rating?: string;
    featured?: string;
  }) => apiFetch<ReviewPaginatedResponse>('/reviews', { params }),

  getStats: () =>
    apiFetch<{ success: boolean; stats: ReviewStats }>('/reviews/stats'),

  update: (id: string, data: { status?: string; featured?: boolean }) =>
    apiFetch<{ success: boolean; review: Review }>(`/reviews/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/reviews/${id}`, {
      method: 'DELETE',
    }),
};

export type Question = {
  _id: string;
  question: string;
  answer: string;
  status: 'pending' | 'answered' | 'rejected';
  featured: boolean;
  createdAt: string;
  answeredAt: string | null;
  product: { _id: string; name: string; slug: string; image: string } | null;
  user: { _id: string; name: string } | null;
  answeredBy: { _id: string; name: string } | null;
};

export type QuestionStats = {
  total: number;
  pending: number;
  answered: number;
  rejected: number;
  featured: number;
};

export type QuestionPaginatedResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  questions: Question[];
};

export const questionApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    featured?: string;
    productId?: string;
  }) => apiFetch<QuestionPaginatedResponse>('/questions', { params }),

  getStats: () =>
    apiFetch<{ success: boolean; stats: QuestionStats }>('/questions/stats'),

  getByProduct: (productId: string) =>
    apiFetch<{ success: boolean; count: number; questions: Question[] }>(
      `/questions/product/${productId}`
    ),

  ask: (productId: string, question: string) =>
    apiFetch<{ success: boolean; question: Question }>('/questions', {
      method: 'POST',
      body: {
        productId,
        question,
      },
    }),

  update: (
    id: string,
    data: { answer?: string; status?: string; featured?: boolean }
  ) =>
    apiFetch<{ success: boolean; question: Question }>(`/questions/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/questions/${id}`, {
      method: 'DELETE',
    }),
};

export type PromoCode = {
  _id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrder: number;
  maxDiscount: number;
  maxUses: number;
  perUserLimit: number;
  usageCount: number;
  startDate: string | null;
  endDate: string | null;
  status: 'active' | 'inactive';
  categories?: string[];
  createdAt: string;
  updatedAt: string;
};

export type PromoStats = {
  total: number;
  active: number;
  inactive: number;
  totalRedemptions: number;
  expiringSoon: number;
};

export type PromoPaginatedResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  promos: PromoCode[];
};

export type PromoFormData = {
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrder: number;
  maxDiscount: number;
  maxUses: number;
  perUserLimit: number;
  startDate: string | null;
  endDate: string | null;
  status: 'active' | 'inactive';
  categories?: string[];
};

export const promoApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
  }) => apiFetch<PromoPaginatedResponse>('/promo', { params }),

  getStats: () =>
    apiFetch<{ success: boolean; stats: PromoStats }>('/promo/stats'),

  create: (data: PromoFormData) =>
    apiFetch<{ success: boolean; promo: PromoCode }>('/promo', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: Partial<PromoFormData>) =>
    apiFetch<{ success: boolean; promo: PromoCode }>(`/promo/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/promo/${id}`, {
      method: 'DELETE',
    }),

  validate: (
    code: string,
    subtotal: number,
    items?: { product: string; quantity: number }[]
  ) =>
    apiFetch<{
      success: boolean;
      promo: Partial<PromoCode>;
      discount: number;
      matchingSubtotal?: number;
    }>('/promo/validate', {
      method: 'POST',
      body: {
        code,
        subtotal,
        items,
      },
    }),
};

export type MaintenanceStatus = {
  enabled: boolean;
  message: string;
  endAt: string | null;
  contactEmail: string;
  contactPhone: string;
  /** False = browse-only mode: customers can see products but cannot buy. */
  sellingEnabled: boolean;
  /** Optional custom notice shown while buying is disabled. */
  sellingMessage: string;
  /** ISO timestamp of the last change (admin header only). */
  updatedAt?: string | null;
};

export const maintenanceApi = {
  getStatus: () =>
    apiFetch<{ success: boolean; maintenance: MaintenanceStatus }>(
      '/maintenance/status'
    ),

  update: (data: Partial<MaintenanceStatus>) =>
    apiFetch<{ success: boolean; maintenance: MaintenanceStatus }>(
      '/maintenance',
      { method: 'PUT', body: data }
    ),
};

export type SmsSettings = {
  provider?: 'bulksmsbd' | 'rtcom';
  apiKey: string;
  gatewayUrl?: string;
  gatewayApiKey?: string;
  gatewayApiKeyVariable?: string;
  gatewaySmsType?: 'url';
  senderId: string;
  signature: string;
  enabled: boolean;
  twoFactorEnabled?: boolean;
  otpExpirySeconds?: number;
};

export type SmsBalance = {
  success: boolean;
  balance: number | null;
  raw?: Record<string, unknown>;
};

export type SmsLog = {
  _id: string;
  to: string[];
  message: string;
  segments: number;
  status: 'sent' | 'failed';
  providerStatus: string;
  providerMessage: string;
  errorCode: string;
  createdAt: string;
};

export const smsApi = {
  getSettings: () =>
    apiFetch<{ success: boolean; settings: SmsSettings }>('/sms/settings'),

  updateSettings: (data: Partial<SmsSettings>) =>
    apiFetch<{ success: boolean; settings: SmsSettings }>('/sms/settings', {
      method: 'PUT',
      body: data,
    }),

  getBalance: () => apiFetch<SmsBalance>('/sms/balance'),

  send: (data: { numbers: string; message: string; senderId?: string }) =>
    apiFetch<{
      success: boolean;
      log: SmsLog;
      provider: Record<string, any>;
      providerMessage: string;
      numbers: string[];
    }>('/sms/send', { method: 'POST', body: data }),

  getLogs: (params?: { page?: number; limit?: number }) =>
    apiFetch<{
      success: boolean;
      logs: SmsLog[];
      total: number;
      page: number;
      pages: number;
    }>('/sms/logs', { params }),
};

export type MetaCatalogStatus = {
  success: boolean;
  connected: boolean;
  enabled: boolean;
  message: string;
  catalog?: {
    id: string;
    name: string;
    productCount: number | null;
  };
};

export const metaApi = {
  getStatus: () => apiFetch<MetaCatalogStatus>('/meta/status'),
};

export type HealthService = {
  status: 'healthy' | 'unhealthy' | 'disabled';
  message: string;
  host?: string;
  name?: string;
};

export type HealthStatus = {
  success: boolean;
  status: 'healthy' | 'unhealthy';
  checkedAt: string;
  uptimeSeconds: number;
  memory: { usedMb: number; heapUsedMb: number };
  nodeVersion: string;
  services: Record<'api' | 'database' | 'redis', HealthService>;
};

export const healthApi = {
  getStatus: () => apiFetch<HealthStatus>('/health'),
};

// ---------------- Offers ----------------
export type Offer = {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const offerApi = {
  getAll: (params?: Record<string, any>) =>
    apiFetch<{ success: boolean; offers: Offer[] }>('/offers', { params }),

  getById: (id: string) =>
    apiFetch<{ success: boolean; offer: Offer }>(`/offers/${id}`),

  getBySlug: (slug: string) =>
    apiFetch<{ success: boolean; offer: Offer }>(`/offers/slug/${slug}`),

  create: (data: FormData) =>
    apiFetch<{ success: boolean; offer: Offer }>('/offers', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: FormData) =>
    apiFetch<{ success: boolean; offer: Offer }>(`/offers/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/offers/${id}`, {
      method: 'DELETE',
    }),
};

export type HolidayConfig = {
  _id?: string;
  heroBadge?: string;
  title?: string;
  subtitle?: string;
  discountPercent?: number;
  endDate?: string | null;
  couponCode?: string;
  couponDescription?: string;
  topDealsTitle?: string;
  topDealsSubtitle?: string;
  active?: boolean;
};

export const holidayApi = {
  getConfig: () =>
    apiFetch<{ success: boolean; config: HolidayConfig }>('/holiday'),

  updateConfig: (data: Partial<HolidayConfig>) =>
    apiFetch<{ success: boolean; config: HolidayConfig }>('/holiday', {
      method: 'PUT',
      body: data,
    }),
};

export type AdminNotificationCategory =
  'order' | 'delivery' | 'rider' | 'payment' | 'system';

export type AdminNotification = {
  _id: string;
  title: string;
  description: string;
  category: AdminNotificationCategory;
  read: boolean;
  link?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const notificationApi = {
  // Fetch a paginated list of notifications. Returns the list plus the
  // running unread count so the UI can stay in sync with new events.
  list: (params?: {
    page?: number;
    limit?: number;
    read?: boolean;
    category?: string;
  }) =>
    apiFetch<{
      success: boolean;
      notifications: AdminNotification[];
      total: number;
      unreadCount: number;
      page: number;
      pages: number;
    }>('/notifications', { params }),

  unreadCount: () =>
    apiFetch<{ success: boolean; unreadCount: number }>(
      '/notifications/unread-count'
    ),

  markRead: (id: string) =>
    apiFetch<{ success: boolean; notification: AdminNotification }>(
      `/notifications/${id}/read`,
      { method: 'PATCH' }
    ),

  markAllRead: () =>
    apiFetch<{ success: boolean; message: string }>('/notifications/read-all', {
      method: 'POST',
    }),
};

// ─── Staff & Access Management ────────────────────────────────────────────────

export type ModulePermission = {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  manage: boolean;
  export: boolean;
};

export type StaffMember = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: 'super_admin' | 'admin' | 'manager';
  active: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissionGroup?: {
    _id: string;
    name: string;
    color: string;
    description: string;
  } | null;
  customPermissions: ModulePermission[];
};

export type StaffStats = {
  total: number;
  active: number;
  inactive: number;
  byRole: { super_admin: number; admin: number; manager: number };
};

export type StaffAuditEntry = {
  _id: string;
  actor?: { id?: string; name?: string; role?: string };
  action: string;
  eventType: string;
  target?: string;
  changes?: Record<string, unknown> | null;
  ip?: string;
  createdAt: string;
};

export type StaffListResponse = {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  members: StaffMember[];
};

export type StaffStatsResponse = {
  success: boolean;
  stats: StaffStats;
  recentActivity: StaffAuditEntry[];
};

export type CreateStaffPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'manager';
  permissionGroup?: string | null;
  customPermissions?: ModulePermission[];
};

export type UpdateStaffPayload = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: 'super_admin' | 'admin' | 'manager';
  permissionGroup?: string | null;
  customPermissions?: ModulePermission[];
};

export const staffApi = {
  getStats: () => apiFetch<StaffStatsResponse>('/staff/stats'),

  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) => apiFetch<StaffListResponse>('/staff', { params }),

  getById: (id: string) =>
    apiFetch<{
      success: boolean;
      member: StaffMember;
      effectivePermissions: ModulePermission[];
    }>(`/staff/${id}`),

  create: (data: CreateStaffPayload) =>
    apiFetch<{ success: boolean; member: StaffMember }>('/staff', {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: UpdateStaffPayload) =>
    apiFetch<{ success: boolean; member: StaffMember }>(`/staff/${id}`, {
      method: 'PUT',
      body: data,
    }),

  toggleStatus: (id: string) =>
    apiFetch<{ success: boolean; active: boolean; message: string }>(
      `/staff/${id}/status`,
      { method: 'PATCH' }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/staff/${id}`, {
      method: 'DELETE',
    }),
};

// ─── Permission Groups ────────────────────────────────────────────────────────

export type PermissionGroup = {
  _id: string;
  name: string;
  description: string;
  color: string;
  permissions: ModulePermission[];
  active: boolean;
  usageCount?: number;
  createdBy?: { id: string; name: string };
  updatedBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export type CreatePermissionGroupPayload = {
  name: string;
  description?: string;
  color?: string;
  permissions: ModulePermission[];
};

export type UpdatePermissionGroupPayload = {
  name?: string;
  description?: string;
  color?: string;
  permissions?: ModulePermission[];
  active?: boolean;
};

export const permissionGroupApi = {
  getAll: () =>
    apiFetch<{ success: boolean; groups: PermissionGroup[] }>(
      '/permission-groups'
    ),

  getById: (id: string) =>
    apiFetch<{ success: boolean; group: PermissionGroup }>(
      `/permission-groups/${id}`
    ),

  create: (data: CreatePermissionGroupPayload) =>
    apiFetch<{ success: boolean; group: PermissionGroup }>(
      '/permission-groups',
      { method: 'POST', body: data }
    ),

  update: (id: string, data: UpdatePermissionGroupPayload) =>
    apiFetch<{ success: boolean; group: PermissionGroup }>(
      `/permission-groups/${id}`,
      { method: 'PUT', body: data }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(
      `/permission-groups/${id}`,
      { method: 'DELETE' }
    ),
};

// ---------------------------------------------------------------------------
// Home page "service finder" cards (managed from /admin/service-finder)
// ---------------------------------------------------------------------------
export type ServiceFinderItem = {
  _id: string;
  title: string;
  subtitle: string;
  /** Icon key resolved by `serviceIcon()` (see lib/serviceIcons.ts). */
  icon: string;
  /** Optional link target; empty renders a non-clickable card. */
  href: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ServiceFinderForm = {
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  active: boolean;
  sortOrder?: number;
};

/** Section-level visibility for the whole homepage service finder block. */
export type ServiceFinderSetting = {
  enabled: boolean;
};

export const serviceFinderApi = {
  /** Section-level switch: hides the whole block on the homepage. */
  getSetting: () =>
    apiFetch<{ success: boolean; setting: ServiceFinderSetting }>(
      '/service-finders/setting'
    ),

  updateSetting: (data: ServiceFinderSetting) =>
    apiFetch<{ success: boolean; setting: ServiceFinderSetting }>(
      '/service-finders/setting',
      { method: 'PUT', body: data }
    ),

  getAll: (params?: { active?: boolean }) =>
    apiFetch<{ success: boolean; items: ServiceFinderItem[] }>(
      '/service-finders',
      {
        params: params
          ? { active: params.active ? 'true' : undefined }
          : undefined,
      }
    ),

  create: (data: ServiceFinderForm) =>
    apiFetch<{ success: boolean; item: ServiceFinderItem }>(
      '/service-finders',
      { method: 'POST', body: data }
    ),

  update: (id: string, data: Partial<ServiceFinderForm>) =>
    apiFetch<{ success: boolean; item: ServiceFinderItem }>(
      `/service-finders/${id}`,
      { method: 'PUT', body: data }
    ),

  delete: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/service-finders/${id}`, {
      method: 'DELETE',
    }),

  reorder: (orders: { id: string; sortOrder: number }[]) =>
    apiFetch<{ success: boolean; message: string }>(
      '/service-finders/reorder',
      { method: 'PUT', body: { orders } }
    ),
};
