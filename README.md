# Bazar Bookstore Project

## Distributed Operating Systems Project  
### Lab 1 + Lab 2

This project implements **Bazar Bookstore**, a small online bookstore system developed for the Distributed Operating Systems course.

The project was implemented in two parts:

- **Lab 1:** Basic multi-tier bookstore using microservices.
- **Lab 2:** Extended version with replication, caching, consistency, load balancing, and performance measurements.

---

## Students

- Hoor Yaish
- Deema Hazeem

---

## Technologies Used

- Node.js
- Express.js
- Axios
- SQLite
- Docker
- Docker Compose
- Postman / Browser / curl for testing

---

## Project Structure

```text
bazar-bookstore/
│
├── catalog_service/
│   ├── app.js
│   ├── Dockerfile
│   ├── package.json
│   ├── catalog1.db
│   └── catalog2.db
│
├── order_service/
│   ├── app.js
│   ├── Dockerfile
│   ├── package.json
│   ├── orders1.db
│   └── orders2.db
│
├── frontend_service/
│   ├── app.js
│   ├── Dockerfile
│   └── package.json
│
├── experiments/
│   └── measure.js
│
├── docs/
│   ├── Bazar_Bookstore_Lab1_Report.pdf
│   ├── Bazar_Bookstore_Lab2_Report.pdf
│   ├── output.txt
│   ├── performance_results.txt
│   └── design_document.md
│
├── docker-compose.yml
├── package.json
└── README.md

```

---

## Project Overview

The system is implemented as a set of microservices. The frontend service acts as the entry point for client requests. The catalog service manages book information such as title, price, and quantity. The order service handles purchase requests and updates stock through the catalog service.

The final version of the project uses Docker Compose to run the system as multiple containers.

---

## Lab 1 Summary

Lab 1 implemented the basic bookstore system with three services:

```text
Frontend Service
Catalog Service
Order Service
```

The system supported:

- Searching books by topic
- Viewing book information by item number
- Purchasing a book
- Storing catalog and order data persistently using SQLite
- Running the services using Docker Compose

The detailed Lab 1 report is available here:

- [Lab 1 Report](docs/Bazar_Bookstore_Lab1_Report.pdf)

---

## Lab 2 Summary

Lab 2 extended the system with distributed systems features:

- Frontend in-memory caching
- Cache hit and cache miss handling
- Cache invalidation for consistency
- Two catalog replicas
- Two order replicas
- Round-robin load balancing
- Catalog replica synchronization
- Order replica synchronization
- Performance measurements

The detailed Lab 2 report is available here:

- [Lab 2 Report](docs/Bazar_Bookstore_Lab2_Report.pdf)

---

## Docker Deployment

The final system runs using Docker Compose.

Main services:

```text
bazar-frontend-service
bazar-catalog-service-1
bazar-catalog-service-2
bazar-order-service-1
bazar-order-service-2
```

The services communicate inside a Docker bridge network using service names such as:

```text
catalog1
catalog2
order1
order2
frontend
```

---

## Ports

| Service | Host Port | Container Port |
|---|---:|---:|
| Frontend | 5000 | 5000 |
| Catalog Replica 1 | 5001 | 5001 |
| Catalog Replica 2 | 5003 | 5001 |
| Order Replica 1 | 5002 | 5002 |
| Order Replica 2 | 5004 | 5002 |

---

## How to Run

Clone the repository:

```bash
git clone https://github.com/dimaHazeem/bazar-bookstore.git
cd bazar-bookstore
```

Run the system:

```bash
docker compose down --remove-orphans
docker compose up --build
```

The frontend will be available at:

```text
http://localhost:5000
```

---

## Example API Requests

Search books:

```http
GET http://localhost:5000/search/distributed%20systems
```

Get book information:

```http
GET http://localhost:5000/info/5
```

Purchase a book:

```http
POST http://localhost:5000/purchase/5
```

View frontend cache:

```http
GET http://localhost:5000/cache
```

Clear frontend cache:

```http
DELETE http://localhost:5000/cache
```

Check catalog replicas directly:

```http
GET http://localhost:5001/info/5
GET http://localhost:5003/info/5
```

---

## Performance Measurements

A performance script is included in:

```text
experiments/measure.js
```

To run it, keep Docker services running, then open another terminal and run:

```bash
node experiments\measure.js
```

The results are documented in:

- [Performance Results](docs/performance_results.txt)

---

## Documentation

The `docs` folder contains:

- [Lab 1 Report](docs/Bazar_Bookstore_Lab1_Report.pdf)
- [Lab 2 Report](docs/Bazar_Bookstore_Lab2_Report.pdf)
- [Design Document](docs/design_document.md)
- [Output File](docs/output.txt)
- [Performance Results](docs/performance_results.txt)

---

## Notes

- SQLite database files are generated and mounted using Docker volumes.
- The frontend cache is stored in memory and is cleared when the frontend restarts.
- The final implementation focuses on the required course concepts rather than production-level fault tolerance.

---

## Conclusion

This project demonstrates the implementation of a microservices-based bookstore system and its extension into a distributed system with caching, replication, consistency, load balancing, and performance measurement.
