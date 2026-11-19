const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.join(__dirname, 'project_report/screenshots/05_frontend_development');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture() {
  console.log('[Puppeteer] Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Login Page
  console.log('Capturing Login Page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '01_login_page.png'), fullPage: false });

  // Login as Student: alice@university.edu / password123
  console.log('Logging in as student: alice@university.edu...');
  await page.type('input[type="email"]', 'alice@university.edu');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await sleep(3500);

  // 2. Student Dashboard
  console.log('Capturing Student Dashboard...');
  await page.screenshot({ path: path.join(OUT_DIR, '02_student_dashboard.png'), fullPage: false });

  // 3. Student Workload Analytics
  console.log('Capturing Student Workload Page...');
  await page.goto('http://localhost:5173/student/workload', { waitUntil: 'networkidle0' });
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT_DIR, '03_student_workload_analytics.png'), fullPage: false });

  // 4. Student Tasks Page
  console.log('Capturing Student Tasks Page...');
  await page.goto('http://localhost:5173/student/tasks', { waitUntil: 'networkidle0' });
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT_DIR, '04_student_tasks.png'), fullPage: false });

  // 5. Student Availability Page
  console.log('Capturing Student Availability Page...');
  await page.goto('http://localhost:5173/student/availability', { waitUntil: 'networkidle0' });
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT_DIR, '05_student_availability.png'), fullPage: false });

  // 6. Student Collisions Page
  console.log('Capturing Student Collisions Page...');
  await page.goto('http://localhost:5173/student/collisions', { waitUntil: 'networkidle0' });
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT_DIR, '06_student_collisions.png'), fullPage: false });

  // Clear token & login as Faculty: sarah@university.edu / password123
  console.log('Logging out and logging in as faculty: sarah@university.edu...');
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await page.type('input[type="email"]', 'sarah@university.edu');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await sleep(3500);

  // 7. Faculty Dashboard
  console.log('Capturing Faculty Dashboard...');
  await page.screenshot({ path: path.join(OUT_DIR, '07_faculty_dashboard.png'), fullPage: false });

  // 8. Faculty Simulator Page
  console.log('Capturing Faculty Simulator Page...');
  await page.goto('http://localhost:5173/faculty/simulator', { waitUntil: 'networkidle0' });
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT_DIR, '08_faculty_what_if_simulator.png'), fullPage: false });

  // 9. Faculty Simulation History
  console.log('Capturing Faculty Simulation History...');
  await page.goto('http://localhost:5173/faculty/simulations', { waitUntil: 'networkidle0' });
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT_DIR, '09_faculty_simulation_history.png'), fullPage: false });

  // 10. Faculty Courses
  console.log('Capturing Faculty Courses Page...');
  await page.goto('http://localhost:5173/faculty/courses', { waitUntil: 'networkidle0' });
  await sleep(3000);
  await page.screenshot({ path: path.join(OUT_DIR, '10_faculty_courses.png'), fullPage: false });

  await browser.close();
  console.log('✅ All 10 frontend screenshots captured successfully in:', OUT_DIR);
}

capture().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
