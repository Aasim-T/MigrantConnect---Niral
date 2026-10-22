// Domain types shared by the API routes and the UI.

export type Role = "worker" | "employer"

export interface EmploymentHistoryItem {
  employer: string
  role: string
  duration: string
  location?: string
}

export interface Worker {
  id: string // MIG-xxxxx
  role: "worker"
  aadhaar: string
  name: string
  dob: string // yyyy-mm-dd
  phone: string
  address: string
  location: string
  skills: string[]
  employmentHistory: EmploymentHistoryItem[]
  education: string
  languages: string[]
  annualIncome?: number
  hasBankAccount?: boolean
  photo?: string // data URL
  createdAt: string
}

export interface Employer {
  id: string // EMP-xxxx
  role: "employer"
  aadhaarGst: string
  contactAadhaar?: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  address: string
  location: string
  website: string
  description: string
  industry: string
  employeeCount: string
  yearEstablished: string
  logo?: string
  createdAt: string
}

export type User = Worker | Employer

export type JobStatus = "Active" | "Closed"

export interface Job {
  id: string
  employerId: string
  title: string
  description: string
  location: string
  salaryMin: number
  salaryMax: number
  type: string
  duration: string
  workingHours: string
  skills: string[]
  responsibilities: string[]
  requirements: string[]
  benefits: string[]
  status: JobStatus
  postedAt: string
  deadline: string
}

export type ApplicationStatus = "New" | "Shortlisted" | "Interviewed" | "Selected" | "Rejected"

export interface Application {
  id: string
  jobId: string
  workerId: string
  employerId: string
  note: string
  status: ApplicationStatus
  appliedAt: string
  updatedAt: string
}

export interface Employment {
  id: string
  workerId: string
  employerId: string
  jobId: string
  applicationId?: string
  title: string
  location: string
  dailyWage: number
  startDate: string
  endDate?: string
  status: "Active" | "Ended"
}

export interface WageRecord {
  id: string
  employmentId: string
  workerId: string
  employerId: string
  jobTitle: string
  period: string
  daysWorked: number
  dailyWage: number
  amount: number
  dueDate: string
  status: "Pending" | "Paid"
  paidAt?: string
  method?: string
  transactionId?: string
  createdAt: string
}

export type GrievanceStatus = "New" | "In Progress" | "Resolved"

export interface GrievanceMessage {
  from: "Worker" | "Employer" | "Admin"
  message: string
  at: string
}

export interface Grievance {
  id: string
  workerId: string
  employerId?: string
  employerName: string
  title: string
  type: string
  description: string
  status: GrievanceStatus
  jobTitle?: string
  workPeriod?: string
  amountDue?: number
  wageRecordId?: string
  filedAt: string
  updatedAt: string
  resolvedAt?: string
  resolution?: string
  acknowledged?: boolean
  feedback?: string
  messages: GrievanceMessage[]
}

export interface EligibilityRules {
  minAge?: number
  maxAge?: number
  maxAnnualIncome?: number
  requiresBankAccount?: boolean
  anySkill?: string[]
}

export interface WelfareScheme {
  id: string
  name: string
  description: string
  eligibility: string
  benefits: string
  documents: string[]
  applicationProcess: string
  rules: EligibilityRules
}

export interface UploadedDocument {
  name: string
  fileName: string
  size: number
  type: string
  dataUrl: string
}

export interface WelfareApplication {
  id: string
  reference: string
  schemeId: string
  workerId: string
  fullName: string
  aadhaarNumber: string
  address: string
  phoneNumber: string
  bankAccount: string
  ifscCode: string
  annualIncome: number
  note: string
  documents: UploadedDocument[]
  status: "Submitted" | "Under Review" | "Approved" | "Rejected"
  submittedAt: string
}

export type NotificationType = "application" | "job" | "grievance" | "wage" | "welfare" | "profile"

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link: string
  read: boolean
  createdAt: string
}

export interface Session {
  token: string
  userId: string
  role: Role
  expiresAt: string
}

export interface OtpRecord {
  key: string // role:purpose:identifier
  codeHash: string
  expiresAt: string
  attempts: number
  verified: boolean
  verificationToken?: string
}

export interface Database {
  version: number
  workers: Worker[]
  employers: Employer[]
  jobs: Job[]
  applications: Application[]
  employments: Employment[]
  wages: WageRecord[]
  grievances: Grievance[]
  schemes: WelfareScheme[]
  welfareApplications: WelfareApplication[]
  notifications: AppNotification[]
  sessions: Session[]
  otps: OtpRecord[]
  counters: Record<string, number>
}
