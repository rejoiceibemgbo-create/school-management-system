# HAPPY HOME EDUCATIONAL CENTRE
## Professional School Result Management System

A modern, responsive, full-stack **School Result Management System** designed for **Happy Home Educational Centre**. The application automates student record management, continuous assessment, terminal examination scoring, observable conduct evaluation, master broadsheet generation with tie-handling, and official A4 school-branded report cards.

---

## 🌟 Key Capabilities & Features

### 1. Student Registration & Management (Zero Pre-Assigned Pupils)
* **Fresh Registry:** Starts with 0 registered students as requested, ready for you to input your pupils.
* **Automated Admission Numbering:** Automatically generates sequential numbers (e.g., `HHEC/2026/001`) or allows custom formats.
* **Comprehensive Pupil Profile:** First Name, Last Name, Middle Name, Gender, Date of Birth, Class, Photo/Avatar, Parent/Guardian details, Phone, Email, Home Address, Admission Date, and Status.
* **Excel Import & Export:** Download a sample template, import spreadsheets (`.xlsx`, `.csv`), or export student data with one click.
* **Batch Promotion:** Promote selected pupils or entire classes to the next grade level with a single click.

### 2. Score Entry & Automated Calculations
* **Score Columns & Permitted Limits:**
  * **Homework:** Maximum 10 marks
  * **First Test:** Maximum 10 marks
  * **Second Test:** Maximum 10 marks
  * **CA Total:** Maximum 30 marks (calculated automatically: $\text{HW} + \text{T1} + \text{T2}$)
  * **Examination:** Maximum 70 marks
  * **Overall Total:** Maximum 100 marks (calculated automatically: $\text{CA Total} + \text{Exam}$)
  * **Grade & Remark:** Automatically derived from the configured grading scale.
* **Default Grading Scale:**
  * **A (70–100):** Excellent
  * **B (60–69):** Very Good
  * **C (50–59):** Good
  * **D (45–49):** Fair
  * **E (40–44):** Pass
  * **F (0–39):** Fail
* **Input Validation:** Restricts scores strictly within permitted bounds ($0\text{--}10$ and $0\text{--}70$).

### 3. General Conduct & Observable Behaviours (1 to 5)
* Evaluates all 10 character traits:
  * **Punctuality, Regularity, Neatness, Honesty, Obedience, Respect, Participation in Class, Cooperation, Leadership, and Responsibility**.
* Rating guide:
  * **5** = Excellent | **4** = Very Good | **3** = Good | **2** = Fair | **1** = Poor

### 4. Attendance & Report Remarks
* **Attendance:** Records Total School Days and Days Present; automatically computes Days Absent.
* **Remark Presets:** 1-click helper suggestions for Class Teachers and Head Teachers, plus custom editing.
* **Advancement Status:** Promoted, Promoted on Trial, Repeat, Pending, or Graduated.

### 5. Official Student Report Cards
* **Official Branding:** Features the school logo (`/logo.jpeg`), school motto, contact details, student photograph/avatar, academic breakdown, conduct matrix, attendance, signatures, and official school stamp.
* **Compulsory Print & Download Options:**
  1. **Download Individual PDF:** Downloads a clean `.pdf` report card.
  2. **Print Individual Report Card:** High-fidelity print preview styled for an exact A4 page.
  3. **Download All Class Report Cards (PDF):** Compiles all students in the class into a single multi-page PDF.
  4. **Print All Class Report Cards:** Triggers multi-student browser printing where each student automatically prints on a separate A4 page (`page-break-after: always`).
  5. **Select Specific Students:** Select multiple pupils to print or download.

### 6. Class Result Summary (Master Broadsheet)
* Displays every student in the class, their marks across all subjects, Total Score, Average Score, Overall Grade, Number of Passed/Failed Subjects, and Class Position.
* Handles ties accurately (e.g. 1st, 2nd, 2nd, 4th).
* Includes **Export to Excel (.xlsx)** and **Print Broadsheet** buttons.

---

## 🚀 How to Run Locally

### Option A: 1-Click Launch (Windows)
Double-click the [`run-school-system.bat`](file:///c:/Users/HP-UK/Desktop/School%20Management%20System/run-school-system.bat) file located in the root folder. It will launch the application and open your browser automatically to `http://localhost:3000`.

### Option B: Terminal Command
Open Windows PowerShell in the project directory:
```powershell
cd "c:\Users\HP-UK\Desktop\School Management System\my-app"
npm.cmd run dev
```
Then visit [http://localhost:3000](http://localhost:3000) in any web browser.

---

## 👥 Pre-Configured Test Accounts

All accounts share the password: `password123`

| User Role | Email | Purpose |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@happyhome.edu` | Full system control, global access |
| **School Admin** | `admin@happyhome.edu` | Administrative registrations, records, and settings |
| **Head Teacher** | `headteacher@happyhome.edu` | Moderation, result approval, locks, and endorsements |
| **Class Teacher (P1)** | `teacher.p1@happyhome.edu` | Primary 1 scores, conduct, attendance, and comments |
| **Class Teacher (P2)** | `teacher.p2@happyhome.edu` | Primary 2 scores, conduct, attendance, and comments |
| **Subject Teacher** | `subject.teacher@happyhome.edu` | Subject score entry |

*Note: Use the **"Role: [Name] Switch"** pill in the top navigation bar to switch between user roles with 1 click.*

---

## 🌐 Online Deployment Guide

### Deploying to Vercel (Recommended & Easiest)
1. Push the `my-app` repository to your GitHub account.
2. Sign in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your repository and select the `my-app` root directory.
4. Click **Deploy**. Vercel will build and assign you a live HTTPS URL (e.g. `https://happyhome.vercel.app`).

### Connecting a Custom Domain (e.g. `www.happyhome.edu.ng`)
1. In your Vercel Dashboard, go to **Settings $\rightarrow$ Domains**.
2. Enter your school's domain name (e.g., `results.happyhome.edu.ng` or `happyhome.edu.ng`).
3. Add the provided `CNAME` or `A` records in your domain registrar's DNS management panel.

### Connecting to Supabase / PostgreSQL
The production database schema is prepared at [`scripts/schema.sql`](file:///c:/Users/HP-UK/Desktop/School%20Management%20System/my-app/scripts/schema.sql).
1. Create a free project at [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Paste the contents of `scripts/schema.sql` and click **Run**.
4. Set the environment variables in your deployment settings:
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```

---

## 💾 Database Backups

* **1-Click JSON Backup:** Navigate to **School Settings $\rightarrow$ Database & Backup** and click **Export & Download Backup**.
* **Database Restore:** In the same tab, upload a previously exported backup file to restore records.

