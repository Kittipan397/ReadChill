package config

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client
var Ctx = context.Background()

// InitRedis initializes the Redis client
func InitRedis() {
	redisURL := GetEnv("REDIS_URL", "redis://localhost:6379")
	
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("error parsing Redis URL: %v\n", err)
	}

	client := redis.NewClient(opt)

	_, err = client.Ping(Ctx).Result()
	if err != nil {
		log.Printf("Warning: Could not connect to Redis (%v). Running without cache.\n", err)
		return
	}

	RedisClient = client
	log.Println("Redis connected successfully")
}
