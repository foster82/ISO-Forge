#!/bin/bash

# iso-forge CLI helper
# Usage: ./iso-cli.sh <command> [args]

BASE_URL="http://localhost:3000/api/v1"
COOKIE_FILE=".iso-forge-cookie"
API_KEY_FILE=".iso-forge-key"

function usage() {
    echo "ISO Forge CLI"
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Authentication:"
    echo "  The CLI will use the API key in '$API_KEY_FILE' if it exists."
    echo "  Otherwise, it will fall back to the session cookie in '$COOKIE_FILE'."
    echo ""
    echo "Commands:"
    echo "  images                       List base images"
    echo "  profiles                     List configuration profiles"
    echo "  jobs                         List recent build jobs"
    echo "  status <job_id>              Get status of a specific job"
    echo "  build <profile_id>           Trigger a new build from a profile"
    echo ""
}

function get_auth_args() {
    if [ -f "$API_KEY_FILE" ]; then
        echo "-H x-api-key:$(cat "$API_KEY_FILE")"
    elif [ -f "$COOKIE_FILE" ]; then
        echo "-b $COOKIE_FILE"
    else
        echo "Error: Not authenticated. Please provide an API key in '$API_KEY_FILE' or a session cookie in '$COOKIE_FILE'." >&2
        exit 1
    fi
}

case "$1" in
    images)
        AUTH=$(get_auth_args)
        curl -s $AUTH "$BASE_URL/images" | jq .
        ;;
    profiles)
        AUTH=$(get_auth_args)
        curl -s $AUTH "$BASE_URL/profiles" | jq .
        ;;
    jobs)
        AUTH=$(get_auth_args)
        curl -s $AUTH "$BASE_URL/jobs" | jq .
        ;;
    status)
        if [ -z "$2" ]; then
            echo "Usage: $0 status <job_id>"
            exit 1
        fi
        AUTH=$(get_auth_args)
        curl -s $AUTH "$BASE_URL/jobs/$2" | jq .
        ;;
    build)
        if [ -z "$2" ]; then
            echo "Usage: $0 build <profile_id>"
            exit 1
        fi
        AUTH=$(get_auth_args)
        curl -s $AUTH -X POST "$BASE_URL/profiles/$2/build" | jq .
        ;;
    *)
        usage
        ;;
esac
