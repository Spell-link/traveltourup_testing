# Project Documentation Index

> **Start here for onboarding + architecture (matches current repo):** [DEVELOPER_ONBOARDING_AND_ARCHITECTURE.md](./DEVELOPER_ONBOARDING_AND_ARCHITECTURE.md)

| Document | Purpose |
|----------|---------|
| [DEVELOPER_ONBOARDING_AND_ARCHITECTURE.md](./DEVELOPER_ONBOARDING_AND_ARCHITECTURE.md) | **Onboarding for new developers / Cursor** — stack, folders, RBAC, request lifecycles, admin generic UI (blog + users), public module pattern, flight→booking→payment flow, car module checklist |
| [MODULE_BLUEPRINT.md](./MODULE_BLUEPRINT.md) | Planned blueprint (file may be absent in repo — use onboarding doc above) |
| [MOBILE_PLANNING/MOBILE_APP_PLANNING.md](./MOBILE_PLANNING/MOBILE_APP_PLANNING.md) | **React Native mobile app** — stack decision, architecture, auth strategy, implementation roadmap, backend API gaps |
| [MOBILE_PLANNING/DEPLOYMENT_AND_PRE_LAUNCH_CHECKLIST.md](./MOBILE_PLANNING/DEPLOYMENT_AND_PRE_LAUNCH_CHECKLIST.md) | **Deployment & pre-launch** — store setup, CI/CD, environments, CORS, costs, legal, checklists |
| [MOBILE_API_COMPATIBILITY_REQUIREMENTS.md](./MOBILE_API_COMPATIBILITY_REQUIREMENTS.md) | Bearer token auth, CORS config, auth proxy endpoints, React Native integration |
| [MAIN_PLANNING.md](./MAIN_PLANNING.md) | Project-wide planning and module roadmap |

### Legacy docs (superseded by MODULE_BLUEPRINT.md)

| Document | Status |
|----------|--------|
| [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md) | Superseded — detailed step-by-step, now consolidated into blueprint |
| [PROFESSIONAL_MODULE_CRUD_BLUEPRINT_BLOG_REFERENCE.md](./PROFESSIONAL_MODULE_CRUD_BLUEPRINT_BLOG_REFERENCE.md) | Superseded — verbose blueprint with tier system |
| [BLOG_MODULE_IMPLEMENTATION_GUIDE.md](./BLOG_MODULE_IMPLEMENTATION_GUIDE.md) | Superseded — blog-specific walkthrough |

---

# project analysis 

## this is the traveling and flight booking project along with the car and hotel booking features and now basic level of duffel api integrated just
## mainly this project is created in the core php and bootsrap with the basic ui 
## but now we want to upgrade this project with the latest ui using the next js 
and now we have created the new next js project(in folder of "frontend_next_app") with latest ui and mock data(backend is not integrated yet) while the backend should be in core php as of this main project 

## and this project is created by another developer who is not available anymore and i have many confusion with the complete flow of this project 
Basically i want to integrate the backend with the frontent in frontend_next_app project 
and also need to integrate the enterprize level of duffel api with this project so you need to create the multiple planning file in which 
1) firstally explain the current version of this project and ignore the frontend_next_app as its created by me 
2) secondaly explain how to create the api end points for all the routes which need the dynamic data like the blogs .etc which should be used in the frontend_next_app project as currentaly all the things handled in the php project 
3) which kind of things should be removed from this project and list of api end points which we need for the frontend_next_app project according to the current version of this php project 
4) and explore the duffel api for the entreprize level and check which kind of features should be integrated for this project with the proper explanation like flight,cars,hotel and thier booking with the features like the seat booking .etc and currentally which kind of the creadentials need for the duffel api and if in this project present those api keys
5) and than which new features are compulsory for interprize level  duffel  for this flight booking app and how to create the api end points using the duffel api and than how to use these end points in the frontend_next_app project  
6) how to update and optimize the backend project in the generic way in the best practices so that i can create new crud and api end point in the easy way and in the optimized and professional way in core php and than use those end point in the frontend_next_app project


analyse this complete project and create the md files for my requirements and planning for the implementation should be phase wise so that i can implement in the easy way by flowing those planning files 





# creating the backend with the next js 



now i finalize to use the next js for full backend using the supabase (for db,auth, file management and using the prisma orm)

so now i want multiple planning file with the comprehensive explanation and solid  implementation plan according to the best practices of next js and supabase in the generic and professional way 

so firsrt file should be for overall descusion file explaining each and every things   and use the C:\xampp\htdocs\trraveltourup_latest\example_sql_data\u928112749_trvlr.sql this file which used in the old project and also explain for which one we need bd structure with coloumns names need as we use the duffel api(for enterprize level duffel ) and many of data should be given and we donot store that we just need some important list  info about the flight ,hotels and cars from the duffel and than call in the api end points and than just use in the fronten side and 
we just need to store the booking info in our own db and users info and there is some option to store hotels and cars manualy also using the dashboard along with the duffel provided hotels and cars data 

secondally foundation file with the  Supabase + Prisma working; Auth (register/login); Duffel search callable

and than file explaining the complete and generic crud and backend setup step by step in the professional and optimized and according to the best practices of the next js and supabase 

and than others files for this flight booking site 




so i need the professional prompt for this requirement which i will use for ai assistance to do this one 









now also make sure to create the generic flow for file handling and uploading for frontend and backend side both and make sure it should be handled each and every things by itself in the generic way(with different variant if need) which can be used for any one for upload,replace and delete  and now implement on the blog file upload and replace the previous blog image upload with the generic and in this generic we can pass the  props like bucket_name , resource name .ect



now check complete crud implementation for the blogs which need better generic approach and This will act as a blueprint for all other modules(where api ,auth and role and permission, admin side crud all these should be same and public side just ui can changed for module while all the others should be using the same approach ). basically i am not satisfied with implemented crud implementation for admin, public and for both frontend and backend with generic approach (firstally the file and component naming convention is not professional and  than check other things )
now i want to reupdate the generic approach for complete crud with professional naming conventions



This will be used as a long-term foundation for a multi-module travel platform, so design carefully.
⚙️ Best Practices
Include:
Code organization
Scalability patterns
Security considerations
Performance optimization
Maintainability
⚠️ Important Notes
Avoid overengineering, but keep it scalable
Follow real-world production standards
Use clean and readable code
Prefer composition over duplication
Everything should be reusable and generic



now i want create the complete and professional and solid planning in which explain each and every things if i create the mobile application using the same backend and same auth and api end points as of used in this next js app(in which we just implement main modules in which there is main flights,hitels and car along with booking flow and with the my booking flow and there is no need for admin module in mobile side just those module need for customer end) using the one of best stack either react native or other (prefer react native as i am expert in mern and react native but if there is some severe issue than consider to choose another stack ) and mention all important things including all considerations and after selecting the stack create the solid planning doc file mentioning how to setup ,prequisites and complete implementation plan according to the best practices and using the generic approach and in the optimized way and in the industry standard and professional way 






Now I want to create a mobile application that reuses the same backend, authentication system, and API endpoints as of used in this next js application. The mobile app is customer-facing only (no admin panel).

Your task is to create a complete, professional, and production-grade planning document for the mobile app.
firtally i want to create solid foundation for mobile application for demo purpose and than use this to include other feature step by step 

Requirements:

**Customer mobile app (full plan):** [MOBILE_CUSTOMER_APP_PLAN.md](./MOBILE_CUSTOMER_APP_PLAN.md) — React Native / Expo, auth, API reuse, modules, and phased roadmap.

1. Stack Selection:
   - Prefer React Native (since I have MERN + React Native experience).
   - If there are strong technical limitations, suggest a better alternative with justification.

2. Architecture & Design:
   - Define scalable and modular architecture for the mobile app.
   - Follow best practices for API consumption, state management, and folder structure.
   - Ensure clean separation of concerns and reusable components.

3. Authentication:
   - Use existing Supabase Auth (JWT/session handling).
   - Plan secure token storage and refresh strategy for mobile.

4. API Integration:
   - Reuse existing Next.js APIs.
   - Define a generic API service layer with error handling and retries.

5. Modules to Implement:
   - Flights (listing, filters, details)
   - Hotels (listing, filters, details)
   - Cars (listing, filters, details)
   - Booking Flow (search → select → checkout → confirmation)
   - My Bookings (history, details, status)

6. State Management:
   - Recommend best approach (Redux Toolkit / Zustand / React Query, etc.)
   - Optimize for performance and scalability.

7. Navigation:
   - Define navigation structure (tabs + stack).
   - Handle deep linking if needed.

8. UI/UX:
   - Suggest modern, scalable UI approach.
   - Include design system considerations (themes, responsiveness).

9. Performance & Optimization:
   - Lazy loading, caching, API optimization, image handling.

10. Security:
   - Secure storage, API protection, validation strategies.

11. Setup & Prerequisites:
   - Environment setup (React Native CLI / Expo decision)
   - Required tools, libraries, configurations.

12. Folder Structure:
   - Provide a clean, scalable, and industry-standard structure.

13. Implementation Plan:
   - Step-by-step roadmap from setup to production.
   - Use a generic and reusable approach.

14. Additional Considerations:
   - Error handling strategy
   - Logging and monitoring
   - Offline handling (if applicable)
   - Versioning and updates

Make the response:
- Concise but comprehensive
- Structured as a professional planning document ( an MD file)
- Based on real-world best practices and production standards
- Optimized for scalability, maintainability, and developer experience




basically there need to improment in the ui related to the 
there should be departure and return date like the given image from duffel  with the flight time for each with default "At any time" with exact same ui like the given images 

and also make sure to show the same ui airline select  with search in the professional way and optimized way 


and also check others things and make sure all the things should be working well and optimized and according to the best practices





now one more developer will involve and start the developing in the next modules and will update and resolve error of existing modules but he nothings know about  this project 
so first of all explore each and every things about the current state and flow of this project and understand each and every things about this project 
so i want the complete and solid and professional planning md file which should explain each and every things about the flow and generic structure of this project which i will teach and present him to tell him how this project developed and using the generic structure for each module for client side and admin side with the api site development according to the best practices like 
1. how set and manage the permissions generically for each module 
2. whats the request lifecycle for each module set and manage in this project for both admin and client side and api side 
3. in the admin side how to implement and use the generic components including the data-table,generic-filters,generic-form and others things with proper permissions use the blog and users module both frontend and api side 
4. in the client side , how to create the new module following the blog module in which ui can be changed but overall flow should be same for both frontend and api side
5. how to the flight module developed with complete flow of search list , detail page ,checkout,booking and payment so that he can follow same kind of flow as i will complete the car module 


make sure explain each and every things in professional and in this way so i will explain and he can understand in the easy way and nothings should be massive and every things should be clear 

and also he can also use to give the cursor ai so that cursor will follow the same flow and stucture to create the new module like the car module according to current structure and flow of this project in the generic way for each and every things like for api ,db, validation,client side,admin side and for frontend for both (client and admin) by following the current follow for each




### Hotels related issue lists:


also exlore the current flight module implementation for flight booking detail  and than check and explore the current implementation of hotel booking detail along with  official documentation of duffel for hotel booking detail from the internet completely and than create the professional and solid planning for enhancement of bokking detail page for hotel by following the flights module for this one 

and than also check this given image from the duffel dashboard for stays booking page for presentation of the stays booking detail in the professional way 