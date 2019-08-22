# Run Decompress

This [Cloud Run](https://cloud.google.com/run/) service is designed to handle event-driven triggers from uploaded `.zip` files to a source [GCS](https://cloud.google.com/storage/) bucket, and decompress them into a destination [GCS](https://cloud.google.com/storage/) bucket.

## Create Buckets
1. Create Source Bucket:
```
gsutil mb gs://[SOURCE_BUCKET]
```
2. Create Destination Bucket:
```
gsutil mb gs://[DESTINATION_BUCKET]
```

## Deploy Cloud Run Service
1. Build Image:
```
gcloud builds submit --tag gcr.io/[PROJECT_NAME]/run-decompress
```
2. Deploy service:
```
gcloud beta run deploy run-decompress --image gcr.io/[PROJECT_NAME]/run-decompress --platform managed --no-allow-unauthenticated --update-env-vars DestinationBucket=[DESTINATION_BUCKET]
```
3. The deployed service will return an HTTP URL, note this as [SERVICE_URL].

Variable definitions:
* [PROJECT_NAME]: Name of the GCP project where the service will be deployed.
* [DESTINATION_BUCKET]: Name of the destination bucket where decompressed files are stored.

Further documentation:
* Cloud Build > Documentation> [Starting builds manually](https://cloud.google.com/cloud-build/docs/running-builds/start-build-manually)
* Cloud Run > Documentation > [Deploying container images](https://cloud.google.com/run/docs/deploying)

## Configure Source Bucket Trigger
1. Create a Pub/Sub Topic for new objects placed in bucket: 
```
gsutil notification create -t [TOPIC_NAME] -f json -e OBJECT_FINALIZE gs://[SOURCE_BUCKET]
```
2. Create a Service Account for Subscription:
```
gcloud iam service-accounts create [SERVICE_ACCOUNT_NAME] --display-name "[DISPLAYED_SERVICE_ACCOUNT_NAME]"
```
3. Give Subscription Service Acccount permissions to invoke Cloud Run service: 
```
gcloud beta run services add-iam-policy-binding [SERVICE_NAME] \
    --member=serviceAccount:[SERVICE_ACCOUNT_NAME]@[PROJECT_ID].iam.gserviceaccount.com \
    --role=roles/run.invoker
```
4. Enable project to create Cloud Pub/Sub authentication tokens: 
```
gcloud projects add-iam-policy-binding [PROJECT_ID]] \
     --member=serviceAccount:service-[PROJECT_NUMBER]@gcp-sa-pubsub.iam.gserviceaccount.com \
     --role=roles/iam.serviceAccountTokenCreator
```
5. Create Cloud Pub/Sub Subscription:
```
gcloud beta pubsub subscriptions create [SUBSCRIPTION_NAME] --topic [TOPIC_NAME] \
     --push-endpoint=[SERVICE_URL]/ \
     --push-auth-service-account=[SERVICE_ACCOUNT_NAME]@[PROJECT_ID].iam.gserviceaccount.com
```

Variable definitions:
* [TOPIC_NAME]: Desired name for the Pub/Sub Topic to be created and used.
* [SOURCE_BUCKET]: Name of the source bucket where compressed files are uploaded.
* [SERVICE_ACCOUNT_NAME]: Desired name of the service account to be used.
* [DISPLAYED_SERVICE_NAME]: Desired free-form description of the service account to be used.
* [SERVICE_NAME]: Name of the service deployed in the previous section. *This must match previous data.*
* [PROJECT_ID]: Project ID of the GCP project where the service will be deployed (e.g. `project-name`).
* [PROJECT_NUMBER]: Project Number of the GCP project where the service will be deployed (e.g. `01234567890`).
* [SUBSCRIPTION_NAME]: Desired name for the Pub/Sub Subscription to be created.
* [SERVICE_URL]: URL of the deployed service (e.g. `https://examplename-a1b2c3-uc.a.run.app`). *This must match previous data.*

Further documentation:
* Cloud Storage > Documentation > [Registering object changes](https://cloud.google.com/storage/docs/reporting-changes)
* Cloud Run > Documentation > [Triggering from Cloud Pub/Sub push](https://cloud.google.com/run/docs/events/pubsub-push)
* Cloud Run > Documentation > [Using Cloud Pub/Sub with Cloud Run tutorial](https://cloud.google.com/run/docs/tutorials/pubsub)

## Test
1. Copy test zip file to Source Bucket:
```
gsutil cp testZip.zip gs://[SOURCE_BUCKET]/
```
2. Check Destination Bucket for decompressed files:
```
gsutil ls gs://[DESTINATION_BUCKET]
```

Variable definitions:
* [SOURCE_BUCKET]: Name of the source bucket where compressed files are uploaded.
* [DESTINATION_BUCKET]: Name of the destination bucket where decompressed files are stored.

## Cleanup
1. Remove Source & Destination Buckets: [SOURCE_BUCKET], [DESTINATION_BUCKET]
2. Remove Pub/Sub Topic: [TOPIC_NAME]
3. Remove Pub/Sub Subscription: [SUBSCRIPTION_NAME]
4. Remove Service Account: [SERVICE_ACCOUNT_NAME]
5. Remove Service: [SERVICE]

## Dependencies

* **express**: Web server framework.
* **body-parser**: express middleware for request payload processing.
* **@google-cloud/storage**: Idiomatic client for Google Cloud Storage.
* **unzipper**: Active fork and drop-in replacement of the node-unzip to decompress files.
* **path**: For file extension processing.

## References
* [Google Cloud Platform Medium: Google Cloud Storage "exploder"](https://medium.com/google-cloud/google-cloud-storage-exploder-221c5b4d219c)