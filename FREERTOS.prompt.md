# Prepare a plan to convert the code in main.cpp to FreeRTOS code and fllow the guideline below:

- PlatformIO is the ecosystem used for building and managing the ESP32 project.
- All data sent and received are done through Ethernet.
- send and receive data using jhagas/ESPSupabase from github or any other suitable library.
- Update the function `sendJsonPost` to use jhagas/ESPSupabase instead of the previous HTTP POST method.
- Use both ESP32 cores and Decide which tasks should run on each core.
- Enable usage of queues for inter-task communication and data sharing between different FreeRTOS tasks.
- Ensure proper synchronization mechanisms, such as mutexes or semaphores, are used to protect shared resources.
- Use Supabase SKILL for interacting with the database efficiently.

## Task 1

- Listen to realtime (INSERT, UPDATE) from the Supabase database on table `nodes` which has a field called `name` and another field called `transmission_period`. If the local variable `name` is identical to table `name` field, then update transmission period `SENSOR_POST_INTERVAL_MS` according to `transmission_period`.

## Task 2

- Send sensor data to the Supabase database table `sensors` at intervals defined by `SENSOR_POST_INTERVAL_MS`. Ensure that the data is sent reliably and handle any potential errors during transmission.
- Data must not be sent to `sensors` table if there is no entry in `nodes` table with `name` equal to local `name` variable
- Data must not be sent to `sensors` table if there is there an entry in `nodes` table with `name` equal to local `name` variable, but `enabled` is false.

## Task 3

- Handle interrupt from interruptPin and ensure that the corresponding ISR properly notifies the relevant FreeRTOS task to process the interrupt.
