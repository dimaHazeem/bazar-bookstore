# Bazar Bookstore Lab 2 Design Document

## 1. Overview

This project is an extension of the Lab 1 Bazar Bookstore system. In Lab 1, the system was implemented as a REST-based microservice application with three main services: a frontend service, a catalog service, and an order service. Lab 2 extends this system by adding replication, caching, consistency mechanisms, and performance measurements.

The goal of Lab 2 is to improve request processing latency and system scalability by adding an in-memory cache at the frontend and creating replicated backend services. The backend now contains two catalog replicas and two order replicas. The frontend is not replicated and acts as the entry point for all client requests.

The project was implemented using Node.js, Express.js, Axios, SQLite, and Docker Compose.

## 2. System Architecture

The final system contains the following services:

- Frontend service
- Catalog replica 1
- Catalog replica 2
- Order replica 1
- Order replica 2

The frontend receives all client requests. For read requests, such as `info` and `search`, the frontend communicates with the catalog replicas. For write requests, such as `purchase`, the frontend communicates with the order replicas.

The services communicate using HTTP REST APIs. Docker Compose is used to run the services as separate containers on the same Docker bridge network.

The main ports are:

| Service | Internal Port | Host Port |
|---|---:|---:|
| Frontend | 5000 | 5000 |
| Catalog Replica 1 | 5001 | 5001 |
| Catalog Replica 2 | 5001 | 5003 |
| Order Replica 1 | 5002 | 5002 |
| Order Replica 2 | 5002 | 5004 |

## 3. Catalog Service

The catalog service stores book information in a SQLite database. Each book entry contains:

- Book ID
- Title
- Topic
- Price
- Quantity in stock

The catalog service supports these main endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/search/:topic` | GET | Returns books that belong to a topic |
| `/info/:id` | GET | Returns title, quantity, and price of a book |
| `/update/:id` | PUT | Updates book quantity or price |
| `/sync/update/:id` | PUT | Synchronizes updates from the other catalog replica |

Lab 2 added three new books to the catalog:

1. How to finish Project 3 on time
2. Why theory classes are so hard
3. Spring in the Pioneer Valley

## 4. Order Service

The order service handles purchase requests. Each order service replica has a SQLite database for storing order records.

The order service supports these endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/purchase/:id` | POST | Purchases a book |
| `/sync/order` | POST | Synchronizes an order from the other order replica |

When a purchase request is received, the order service performs these steps:

1. Query the catalog service for the requested book.
2. Check if the book is in stock.
3. Call the catalog update endpoint to decrement the stock quantity.
4. Insert the order into the local orders database.
5. Send the order record to the other order replica for synchronization.
6. Return the purchase result to the frontend.

If the book is out of stock, the purchase request fails.

## 5. Frontend Service

The frontend service is the only service directly accessed by the client. It exposes the same user-facing endpoints as Lab 1:

| Endpoint | Method | Description |
|---|---|---|
| `/search/:topic` | GET | Searches books by topic |
| `/info/:id` | GET | Returns book details |
| `/purchase/:id` | POST | Purchases a book |
| `/cache` | GET | Displays current cache contents |
| `/cache` | DELETE | Clears the cache manually |
| `/invalidate/:id` | POST | Invalidates one cached item |

The frontend also performs two new Lab 2 responsibilities:

1. In-memory caching
2. Round-robin load balancing

## 6. In-Memory Cache

The frontend contains a simple in-memory JavaScript object used as a cache. It stores results of book lookup requests.

Example cache entry:

```js
{
  "info:5": {
    "title": "How to finish Project 3 on time",
    "quantity": 5,
    "price": 45
  }
}
```

When a client sends an info request, the frontend first checks the cache.

If the item is found in the cache, the frontend returns the cached result directly. This is a cache hit.

If the item is not found, the frontend forwards the request to one of the catalog replicas, stores the result in the cache, and returns the result to the client. This is a cache miss.

Caching is only used for read requests. Purchase and update requests are not served from the cache because they modify system state.

7. Cache Consistency and Invalidation

To avoid stale data, the cache must be invalidated when a book is updated. This happens during purchases or catalog updates.

Before the catalog service writes an update to its SQLite database, it sends a request to the frontend:
```http

POST /invalidate/:id

```
The frontend then removes the cached entry for that item.

For example, if item 5 is cached and then purchased, the catalog service sends an invalidation request for item 5. The frontend deletes info:5 from the cache. The next request for item 5 becomes a cache miss and retrieves the fresh quantity from the catalog database.

This maintains stronger consistency because stale cached quantities are not returned after a purchase.

8. Load Balancing

The frontend uses round-robin load balancing for both catalog and order replicas.

For catalog requests, the frontend alternates between:
```text

http://catalog1:5001
http://catalog2:5001

```
For order requests, the frontend alternates between:
```text

http://order1:5002
http://order2:5002

```

This distributes requests across the replicas.

Example for catalog requests:

/info/5 -> catalog1
/info/6 -> catalog2
/info/7 -> catalog1

Example for order requests:

/purchase/5 -> order1
/purchase/6 -> order2
9. Catalog Replica Synchronization

Each catalog replica has its own SQLite database file. To keep the replicas consistent, catalog updates are synchronized between replicas.

When a catalog replica receives an update through /update/:id, it:

Sends a cache invalidation request to the frontend.
Updates its own database.
Sends the same update to the other catalog replica using /sync/update/:id.

The /sync/update/:id endpoint updates the receiving replica without forwarding the update again. This prevents an infinite synchronization loop.

For example:

order1 updates catalog1 for item 5
catalog1 updates its local database
catalog1 sends the update to catalog2
catalog2 updates its local database

After synchronization, both catalog replicas show the same quantity for the item.

10. Order Replica Synchronization

Each order replica also has its own SQLite database. To provide stronger replication, the order replicas synchronize order records.

When order1 receives a purchase request, it stores the order locally and sends the order to order2 using:

POST /sync/order

Order2 stores the synchronized order but does not send it back again. This avoids an infinite loop.

The same process happens in the opposite direction when order2 receives a purchase request.

This means both order replicas maintain a copy of the order history.

11. Persistence

The system uses SQLite databases for persistent storage.

Catalog databases:

catalog_service/catalog1.db
catalog_service/catalog2.db

Order databases:

order_service/orders1.db
order_service/orders2.db

Docker volumes are used so the database files are visible and persistent on the host machine. Database files are excluded from GitHub using .gitignore because they are generated at runtime.

12. Design Tradeoffs
Cache inside frontend vs. separate cache service

The cache was implemented inside the frontend service instead of creating a separate cache microservice. This made the design simpler and reduced extra REST calls between frontend and cache. The tradeoff is that the cache is tied to the frontend process. If the frontend restarts, the cache is lost.

Round-robin vs. least-loaded load balancing

Round-robin was chosen because it is simple and easy to test. It distributes requests evenly between replicas. A more advanced approach could use least-loaded load balancing, but that would require tracking the current load on each replica.

SQLite vs. heavier databases

SQLite was used because the lab recommends simple persistent storage such as files or SQLite. It is lightweight and easy to run inside Docker. The tradeoff is that SQLite is not ideal for very large-scale concurrent systems.

Stronger order synchronization

A stronger approach was implemented for order replicas. Instead of allowing each order replica to keep only its own orders, each order is synchronized to the other replica. This improves consistency and makes both order databases contain the same order history.

13. Known Limitations

The system works for the required lab functionality, but it has some limitations:

The frontend is still a single point of failure because it is not replicated.
The in-memory cache is lost if the frontend service restarts.
Synchronization is implemented using simple REST calls and does not use a consensus protocol.
If a replica is down during synchronization, the update may fail to sync immediately.
The system does not currently retry failed synchronization requests.
Concurrent purchases of the same item may still need stronger transaction handling for real production use.

14. Possible Improvements
Possible improvements include:

Add retry logic for failed replica synchronization.
Add health checks for replicas.
Add least-loaded load balancing instead of round-robin.
Add cache size limits and an LRU replacement policy.
Replicate the frontend service.
Use a message queue for more reliable synchronization.
Add more detailed logging and monitoring.
Add automated tests for cache consistency and replica synchronization.

15. How to Run the Project
First, clone the repository and open the project folder.

Then run:

docker compose down --remove-orphans
docker compose up --build

The frontend will be available at:

http://localhost:5000

Example requests:

GET http://localhost:5000/info/5
GET http://localhost:5000/search/distributed%20systems
POST http://localhost:5000/purchase/5
GET http://localhost:5000/cache

Direct catalog replica checks:

GET http://localhost:5001/info/5
GET http://localhost:5003/info/5

Direct order replica ports:

order1: localhost:5002
order2: localhost:5004
16. Performance Measurements

A performance script was added in:

experiments/measure.js

To run it, start the Docker services first, then run:

node experiments/measure.js

The performance results are stored in:

docs/performance_results.txt

The results showed that caching significantly improved read request latency. The average info request without cache was 32.61 ms, while the average info request with cache was 2.35 ms. Purchase requests had higher latency because they require communication with the order service, catalog service, cache invalidation, database update, and replica synchronization.